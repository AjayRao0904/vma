import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink } from 'fs/promises';
import path from 'path';
import { logger } from '../../../lib/logger';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 });
    }

    const thumbnailsDir = path.join(process.cwd(), 'public', 'testthumbnails', sessionId);
    
    try {
      const files = await readdir(thumbnailsDir);
      for (const file of files) {
        await unlink(path.join(thumbnailsDir, file));
      }
      await require('fs').promises.rmdir(thumbnailsDir);

      return NextResponse.json({ message: 'Thumbnails cleaned up successfully' });
    } catch (error) {
      logger.warn('Cleanup completed with warnings', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json({ message: 'Cleanup completed with warnings' });
    }

  } catch (error) {
    logger.error('Cleanup error', error);
    return NextResponse.json(
      { error: 'Failed to cleanup thumbnails' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const thumbnailsBaseDir = path.join(process.cwd(), 'public', 'testthumbnails');
    const sessions = await readdir(thumbnailsBaseDir);
    
    return NextResponse.json({
      sessions,
      count: sessions.length
    });
  } catch (error) {
    return NextResponse.json({
      sessions: [],
      count: 0
    });
  }
}
