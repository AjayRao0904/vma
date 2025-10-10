import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3, generateVideoKey } from '../../lib/s3';
import { writeFile } from 'fs/promises';
import path from 'path';
import { logger } from '../../lib/logger';
import { createUserTempDir, getUserTempSubDir, getUserTempFilePath } from '../../lib/tempStorage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (project.user_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get user name from session
    const userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    // Generate S3 key with user and project names
    const s3Key = generateVideoKey(user.id, projectId, file.name, userName, project.name);

    logger.info('Uploading video to S3', { s3Key, size: file.size, userId: user.id, projectId });

    // Upload to S3
    await uploadToS3(buffer, s3Key, file.type);
    logger.info('Video uploaded to S3 successfully', { s3Key, userId: user.id });

    // Also save to temp directory for FFmpeg processing (thumbnails/scenes)
    // Use user-specific temp directory with project subdirectory
    const userTempDir = await createUserTempDir(user.id);
    const projectTempDir = await getUserTempSubDir(userTempDir, `project-${projectId}`);
    const tempFilePath = getUserTempFilePath(projectTempDir, file.name);
    await writeFile(tempFilePath, buffer);
    logger.info('Video saved to user-specific temp directory', { tempFilePath, userId: user.id, projectId });

    // Save video metadata to database (file_path contains S3 key)
    const videoRecord = await db.createVideo({
      project_id: projectId,
      file_name: file.name,
      file_path: s3Key, // Store S3 key
      file_size: file.size,
      mime_type: file.type
    });

    logger.info('Video metadata saved to database', { videoId: videoRecord.id, userId: user.id, projectId });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      s3Key: s3Key,
      size: file.size,
      type: file.type,
      videoId: videoRecord.id
    });

  } catch (error) {
    logger.error('Error uploading video', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}

// Get list of uploaded videos
export async function GET() {
  try {
    const { listTempVideos } = await import('../../utils/videoStorage');
    const videos = await listTempVideos();

    return NextResponse.json({
      videos: videos.map(fileName => ({
        fileName,
        url: `/api/video/${fileName}`
      }))
    });
  } catch (error) {
    logger.error('Error listing videos', error);
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 });
  }
}