import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';

/**
 * GET /api/music-tracks?sceneId={sceneId}
 * Get all music tracks for a specific scene
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    logger.info('Fetching music tracks for scene', { sceneId });

    // Get all audio variations (music tracks) for the scene
    const tracks = await db.getAudioVariationsBySceneId(sceneId);

    logger.info('Music tracks fetched', { sceneId, count: tracks.length });

    return NextResponse.json({
      success: true,
      tracks
    });

  } catch (error) {
    logger.error('Error fetching music tracks', error);
    return NextResponse.json(
      { error: 'Failed to fetch music tracks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
