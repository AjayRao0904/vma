import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3, generateSceneKey } from '../../lib/s3';
import { logger } from '../../lib/logger';
import { createUserTempDir, getUserTempSubDir, getUserTempFilePath } from '../../lib/tempStorage';

// Get the correct ffmpeg path with proper resolution
let ffmpegPath: string;
try {
  const ffmpegStatic = require('ffmpeg-static');
  
  // Construct the correct absolute path since Next.js/Turbopack corrupts the path
  const projectRoot = process.cwd();
  const correctPath = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  // Use the path that actually exists
  ffmpegPath = existsSync(correctPath) ? correctPath : ffmpegStatic;

  if (!existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
  }

  logger.info('Setting FFmpeg path', { ffmpegPath });
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (error) {
  logger.error('Failed to load ffmpeg-static', error);
  throw new Error('FFmpeg not available');
}

interface SceneSelection {
  id: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  endPercent: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const videoFileName = formData.get('videoFileName') as string;
    const scenesData = formData.get('scenes') as string;
    const projectId = formData.get('projectId') as string;
    const videoId = formData.get('videoId') as string;

    if (!videoFile && !videoFileName) {
      return NextResponse.json({ error: 'No video file or filename provided' }, { status: 400 });
    }

    if (!scenesData) {
      return NextResponse.json({ error: 'No scenes data provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    const scenes: SceneSelection[] = JSON.parse(scenesData);

    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes to export' }, { status: 400 });
    }

    logger.info(`Processing scenes for trimming`, {
      sceneCount: scenes.length,
      scenes: scenes.map((s, i) => ({
        index: i + 1,
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.endTime - s.startTime
      }))
    });

    // Generate unique session ID
    const sessionId = uuidv4();

    // Get user for S3 key generation
    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get project for naming
    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get user name from session
    const userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    // Create user-specific temporary directory for FFmpeg processing
    const userTempDir = await createUserTempDir(user.id);
    const sessionTempDir = await getUserTempSubDir(userTempDir, `scenes-${sessionId}`);

    // Determine video path
    let videoPath: string = '';
    let shouldCleanup = true;

    if (videoFileName) {
      // Look for video in user's project-specific temp directory
      logger.info('Using existing video', { videoFileName, userId: user.id, projectId });
      const projectTempDir = await getUserTempSubDir(userTempDir, `project-${projectId}`);
      videoPath = getUserTempFilePath(projectTempDir, videoFileName);

      logger.info('Looking for video', { videoPath, userId: user.id });

      if (!existsSync(videoPath)) {
        return NextResponse.json({
          error: 'Video file not found in temp storage',
          details: `Please re-upload the video. Looking for: ${videoPath}`
        }, { status: 404 });
      }
      shouldCleanup = false; // Don't delete the original video
    } else if (videoFile) {
      // Handle uploaded file in user's temp directory
      const videoTempDir = await getUserTempSubDir(userTempDir, `video-${sessionId}`);

      // Save uploaded video
      const videoBytes = await videoFile.arrayBuffer();
      videoPath = getUserTempFilePath(videoTempDir, 'source.mp4');
      await writeFile(videoPath, Buffer.from(videoBytes));
      logger.info('Saved uploaded video to user temp directory', { videoPath, userId: user.id });
    } else {
      return NextResponse.json({
        error: 'No video source provided',
        details: 'Either video file or videoFileName must be provided'
      }, { status: 400 });
    }

    logger.info('Using video path', { videoPath, userId: user.id, projectId });
    
    // Process each scene
    const outputFiles: string[] = [];
    const sceneMetadata: any[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const outputFileName = `scene_${(i + 1).toString().padStart(2, '0')}.mp4`;
      const tempOutputPath = getUserTempFilePath(sessionTempDir, outputFileName);
      const duration = scene.endTime - scene.startTime;

      logger.info(`Processing scene ${i + 1}`, { startTime: scene.startTime, endTime: scene.endTime, duration, userId: user.id });

      try {
        // Generate scene with FFmpeg to temp directory
        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .setStartTime(scene.startTime)
            .setDuration(duration)
            .output(tempOutputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('start', (commandLine) => {
              logger.info(`FFmpeg command for scene ${i + 1}`, { commandLine, userId: user.id });
            })
            .on('progress', (progress) => {
              logger.info(`Scene ${i + 1} progress`, { percent: progress.percent?.toFixed(1) || 0, userId: user.id });
            })
            .on('end', () => {
              logger.info(`Scene ${i + 1} completed successfully`, { userId: user.id });
              resolve();
            })
            .on('error', (err) => {
              logger.error(`Error processing scene ${i + 1}`, err, { userId: user.id });
              reject(err);
            })
            .run();
        });

        // Verify output file was created
        if (existsSync(tempOutputPath)) {
          // Read the generated scene file
          const sceneBuffer = await readFile(tempOutputPath);

          // Generate S3 key and upload with user and project names
          const s3Key = generateSceneKey(user.id, projectId, sessionId, outputFileName, userName, project.name);
          logger.info(`Uploading scene ${i + 1} to S3`, { s3Key, userId: user.id });

          await uploadToS3(sceneBuffer, s3Key, 'video/mp4');

          outputFiles.push(s3Key);

          // Save scene to database with S3 key FIRST to get the real UUID
          let dbSceneId = `${sessionId}-${i + 1}`; // Fallback if DB fails
          try {
            const dbScene = await db.createScene({
              video_id: videoId || projectId,
              project_id: projectId,
              name: `Scene ${i + 1}`,
              start_time: scene.startTime,
              end_time: scene.endTime,
              file_path: s3Key, // Store S3 key instead of local path
              session_id: sessionId
            });

            logger.info(`Scene ${i + 1} saved to database`, { sceneId: dbScene.id, userId: user.id });
            dbSceneId = dbScene.id; // Use real UUID from database
          } catch (dbError) {
            logger.error(`Failed to save scene ${i + 1} to database`, dbError, { userId: user.id });
            // Don't fail the whole operation if DB save fails
          }

          // Create scene metadata with REAL database UUID
          const sceneData = {
            id: dbSceneId, // Use real database UUID
            name: `Scene ${i + 1}`,
            startTime: scene.startTime,
            endTime: scene.endTime,
            videoPath: s3Key,
            sessionId,
            createdAt: new Date().toISOString(),
            audioVariations: []
          };

          sceneMetadata.push(sceneData);
          logger.info(`Scene ${i + 1} uploaded to S3`, { s3Key, userId: user.id });

          // Keep temp file for reuse - OS will handle cleanup
        } else {
          logger.error(`Scene ${i + 1} output file not found`, null, { tempOutputPath, userId: user.id });
        }

      } catch (error) {
        logger.error(`Failed to process scene ${i + 1}`, error, { userId: user.id });
        // Continue with other scenes even if one fails
      }
      
      // Add a small delay between scenes to avoid overwhelming FFmpeg
      if (i < scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Don't clean up temp files - keep for reuse, OS will handle cleanup
    logger.info('Scenes uploaded to S3. Temp files kept for reuse', { userId: user.id });

    logger.info(`Successfully processed scenes`, {
      processedCount: outputFiles.length,
      totalCount: scenes.length,
      outputFiles,
      metadataCount: sceneMetadata.length,
      sceneSummary: sceneMetadata.map(s => ({
        id: s.id,
        name: s.name,
        videoPath: s.videoPath
      })),
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      processedScenes: outputFiles.length,
      totalScenes: scenes.length,
      outputFiles,
      sessionId,
      sceneMetadata
    });
    
  } catch (error) {
    logger.error('Error in trim-scenes API', error);
    return NextResponse.json(
      {
        error: 'Failed to process scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
