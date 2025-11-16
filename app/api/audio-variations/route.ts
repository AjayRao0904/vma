import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';

/**
 * GET /api/audio-variations?scene_id=xxx
 * Get all audio variations for a scene
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('scene_id');

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    logger.info('Fetching audio variations for scene', { sceneId });

    const audioVariations = await db.getAudioVariationsBySceneId(sceneId);

    return NextResponse.json(audioVariations);

  } catch (error) {
    logger.error('Error fetching audio variations', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to fetch audio variations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
