import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import db from "../../lib/db";
import { logger } from "../../lib/logger";
import { uploadToS3, generateSceneKey } from "../../lib/s3";
import path from "path";
import { tmpdir } from "os";
import { readFile, unlink } from "fs/promises";
import ffmpeg from "fluent-ffmpeg";

// Auto-configure FFmpeg
import "../../lib/ffmpeg-config";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, video_id, name, start_time, end_time } = body;

    if (!project_id || !video_id || !name || start_time === undefined || end_time === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, video_id, name, start_time, end_time' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const project = await db.getProjectById(project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (project.user_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the original video info
    const video = await db.getVideoById(video_id);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    logger.info('Processing scene cut with FFmpeg', {
      videoId: video_id,
      startTime: start_time,
      endTime: end_time
    });

    // Find the original video file in temp storage
    const tempVideoDir = path.join(tmpdir(), 'aalap-videos', user.id, project_id);
    const originalVideoPath = path.join(tempVideoDir, video.file_name);

    // Generate output filename for cut scene
    const duration = parseFloat(end_time) - parseFloat(start_time);
    const sceneFileName = `scene_${Date.now()}_${start_time}s_to_${end_time}s.mp4`;
    const sceneOutputPath = path.join(tempVideoDir, sceneFileName);

    try {
      // Use FFmpeg to cut the video
      logger.info('Cutting video with FFmpeg', {
        input: originalVideoPath,
        output: sceneOutputPath,
        startTime: start_time,
        duration
      });

      // Use fluent-ffmpeg to cut the video
      await new Promise<void>((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .setStartTime(parseFloat(start_time))
          .setDuration(duration)
          .outputOptions([
            '-c copy',              // Stream copy (no re-encoding)
            '-avoid_negative_ts 1'  // Avoid negative timestamps
          ])
          .output(sceneOutputPath)
          .on('end', () => {
            logger.info('FFmpeg processing complete');
            resolve();
          })
          .on('error', (err) => {
            logger.error('FFmpeg error', { error: err.message });
            reject(err);
          })
          .run();
      });

      // Read the cut video file
      const sceneBuffer = await readFile(sceneOutputPath);
      logger.info('Scene video file read', { size: sceneBuffer.length });

      // Generate S3 key for scene
      const userName = session.user.name || session.user.email?.split('@')[0] || 'user';
      const sessionId = `session_${Date.now()}`;
      const s3Key = generateSceneKey(
        user.id,
        project_id,
        sessionId,
        sceneFileName,
        userName,
        project.name
      );

      // Upload scene to S3
      logger.info('Uploading scene to S3', { s3Key });
      await uploadToS3(sceneBuffer, s3Key, 'video/mp4');

      // Clean up temp file
      await unlink(sceneOutputPath);
      logger.info('Temp scene file deleted', { path: sceneOutputPath });

      // Create scene in database with S3 path
      const scene = await db.createScene({
        video_id,
        project_id,
        name,
        start_time: parseFloat(start_time),
        end_time: parseFloat(end_time),
        file_path: s3Key,
        session_id: sessionId
      });

      logger.info('Scene created with cut video', {
        sceneId: scene.id,
        projectId: project_id,
        s3Key
      });

      return NextResponse.json(scene);

    } catch (ffmpegError: any) {
      logger.error('FFmpeg processing failed', {
        error: ffmpegError.message,
        stderr: ffmpegError.stderr,
        command: `ffmpeg -ss ${start_time} -t ${duration}...`
      });

      // If FFmpeg fails, still create the scene without the cut video file
      const scene = await db.createScene({
        video_id,
        project_id,
        name,
        start_time: parseFloat(start_time),
        end_time: parseFloat(end_time)
      });

      logger.warn('Scene created without cut video due to FFmpeg error', {
        sceneId: scene.id
      });

      return NextResponse.json(scene);
    }
  } catch (error) {
    logger.error('Failed to create scene', error);
    return NextResponse.json(
      { error: 'Failed to create scene' },
      { status: 500 }
    );
  }
}
