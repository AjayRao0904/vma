import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getPresignedUrl } from '../../../lib/s3';
import { logger } from '../../../lib/logger';

/**
 * This endpoint is deprecated when using S3.
 * Videos are now accessed via pre-signed URLs from /api/presigned-url
 * Keeping this for backwards compatibility with local file paths
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // If filename looks like an S3 key (starts with videos/ or scenes/ or thumbnails/)
    if (filename.startsWith('videos/') || filename.startsWith('scenes/') || filename.startsWith('thumbnails/')) {
      // Generate and redirect to pre-signed URL
      try {
        const presignedUrl = await getPresignedUrl(filename, 3600);
        return NextResponse.redirect(presignedUrl);
      } catch (error) {
        logger.error('Error generating pre-signed URL', error, { filename });
        return NextResponse.json({ error: 'Failed to access video' }, { status: 500 });
      }
    }

    // For backwards compatibility with old local file paths
    return NextResponse.json(
      { error: 'File not found. Videos are now stored in S3.' },
      { status: 404 }
    );
  } catch (error) {
    logger.error('Error serving video', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}