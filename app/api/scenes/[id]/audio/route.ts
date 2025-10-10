import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../../../lib/db';
import { logger } from '../../../../lib/logger';

/**
 * GET /api/scenes/[id]/audio
 * Get all audio variations for a scene
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sceneId } = await params;

    logger.info('Getting audio variations for scene', { sceneId });

    // Get scene to verify it exists
    const scene = await db.getSceneById(sceneId);
    if (!scene) {
      logger.error('Scene not found', { sceneId });
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    logger.info('Scene found', { sceneName: scene.name });

    // Get audio variations for this scene
    const audioVariations = await db.getAudioVariationsBySceneId(sceneId);

    logger.info('Audio variations found', {
      sceneId,
      count: audioVariations.length
    });

    // Transform to match frontend expectations
    const transformedVariations = audioVariations.map((audio: any) => {
      const transformed = {
        id: audio.id,
        title: audio.title,
        duration: audio.duration ? `00:${String(Math.floor(audio.duration)).padStart(2, '0')}` : '00:05',
        isPlaying: false,
        audioPath: audio.file_path,  // Use audioPath instead of file_path
        file_path: audio.file_path,  // Keep for backward compatibility
        createdAt: audio.created_at instanceof Date
          ? audio.created_at.toISOString()
          : new Date(audio.created_at).toISOString()
      };
      logger.info('Transformed audio variation', {
        title: audio.title,
        audioPath: transformed.audioPath
      });
      return transformed;
    });

    return NextResponse.json(transformedVariations);

  } catch (error) {
    logger.error('Failed to fetch audio variations', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio variations' },
      { status: 500 }
    );
  }
}
