import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3, generateVideoKey } from '../../lib/s3';
import { writeFile } from 'fs/promises';
import path from 'path';
import { logger } from '../../lib/logger';
import { createUserTempDir, getUserTempSubDir, getUserTempFilePath } from '../../lib/tempStorage';

export async function POST(request: NextRequest) {
  console.log('🎬 Upload request received');
  try {
    const session = await getServerSession();
    console.log('📝 Session:', session?.user?.email);

    if (!session?.user?.email) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const projectId = formData.get('projectId') as string;
    console.log('📹 File:', file?.name, 'Size:', file?.size, 'Project:', projectId);

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Verify user owns the project
    console.log('🔍 Fetching project from database...');
    const project = await db.getProjectById(projectId);
    console.log('📋 Project found:', project?.name);

    if (!project) {
      console.log('❌ Project not found:', projectId);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('👤 Fetching user from database...');
    const user = await db.findUserByEmail(session.user.email);
    console.log('✅ User found:', user?.id);

    if (project.user_id !== user?.id) {
      console.log('❌ User does not own project');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert file to buffer
    console.log('💾 Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('✅ Buffer created, size:', buffer.length);

    // Get user name from session
    const userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    // Generate S3 key with user and project names
    console.log('🔑 Generating S3 key...');
    const s3Key = generateVideoKey(user.id, projectId, file.name, userName, project.name);
    console.log('📍 S3 key:', s3Key);

    // Upload to S3
    console.log('☁️ Uploading to S3...');
    await uploadToS3(buffer, s3Key, file.type);
    console.log('✅ S3 upload complete!');

    // Skip temp directory for now - testing
    console.log('⚠️ Skipping temp directory save for debugging...');

    // Save video metadata to database (file_path contains S3 key)
    console.log('💾 Saving video metadata to database...');
    const videoRecord = await db.createVideo({
      project_id: projectId,
      file_name: file.name,
      file_path: s3Key, // Store S3 key
      file_size: file.size,
      mime_type: file.type
    });
    console.log('✅ Video saved to database, ID:', videoRecord.id);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      s3Key: s3Key,
      size: file.size,
      type: file.type,
      videoId: videoRecord.id
    });

  } catch (error) {
    console.error('❌ ERROR uploading video:', error);
    logger.error('Error uploading video', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
    console.error('Error message:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      error: 'Failed to upload video',
      details: errorMessage
    }, { status: 500 });
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