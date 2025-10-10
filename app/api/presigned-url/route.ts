import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getPresignedUrl } from '../../lib/s3';
import { logger } from '../../lib/logger';

/**
 * Generate pre-signed URLs for S3 objects
 * POST /api/presigned-url
 * Body: { s3Keys: string[] }
 * Returns: { urls: { [key: string]: string } }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { s3Keys } = body;

    if (!s3Keys || !Array.isArray(s3Keys)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { s3Keys: string[] }' },
        { status: 400 }
      );
    }

    // Generate pre-signed URLs for all keys
    const urls: { [key: string]: string } = {};

    for (const key of s3Keys) {
      try {
        const url = await getPresignedUrl(key, 3600); // 1 hour expiration
        urls[key] = url;
      } catch (error) {
        logger.error(`Failed to generate pre-signed URL for ${key}`, error);
        urls[key] = '';
      }
    }

    return NextResponse.json({ urls });
  } catch (error) {
    logger.error('Error generating pre-signed URLs', error);
    return NextResponse.json(
      { error: 'Failed to generate pre-signed URLs' },
      { status: 500 }
    );
  }
}
