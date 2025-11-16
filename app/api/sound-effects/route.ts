import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';

/**
 * GET /api/sound-effects?sceneId=xxx (or scene_id=xxx)
 * Get all generated sound effects for a scene
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId') || searchParams.get('scene_id');

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    logger.info('Fetching sound effects for scene', { sceneId });

    const soundEffects = await db.getSoundEffectsBySceneId(sceneId);

    return NextResponse.json({
      success: true,
      effects: soundEffects
    });

  } catch (error) {
    logger.error('Error fetching sound effects', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to fetch sound effects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
