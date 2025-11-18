import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3 } from '../../lib/s3';
import { logger } from '../../lib/logger';

/**
 * POST /api/upload-script
 * Upload script file to S3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('script') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No script file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
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

    // Generate S3 key for script: scripts/userId_userName/projectId_projectName/filename
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, '_');
    const s3Key = `scripts/${user.id}_${sanitizeForPath(userName)}/${projectId}_${sanitizeForPath(project.name)}/${file.name}`;

    // Upload to S3
    logger.info('Uploading script to S3', { s3Key, fileName: file.name });
    await uploadToS3(buffer, s3Key, file.type || 'text/plain');

    return NextResponse.json({
      success: true,
      fileName: file.name,
      s3Key: s3Key,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    logger.error('Error uploading script', error);
    return NextResponse.json({
      error: 'Failed to upload script',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
