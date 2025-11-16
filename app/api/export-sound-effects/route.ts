import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../lib/s3';
import JSZip from 'jszip';

/**
 * POST /api/export-sound-effects
 * Export selected sound effects as a zip file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sceneId, soundEffectIds } = body;

    if (!sceneId || !soundEffectIds || !Array.isArray(soundEffectIds)) {
      return NextResponse.json({ error: 'Scene ID and sound effect IDs required' }, { status: 400 });
    }

    logger.info('Exporting sound effects', { sceneId, count: soundEffectIds.length });

    // Get all sound effects for the scene
    const soundEffects = await db.getSoundEffectsBySceneId(sceneId);

    if (!soundEffects || soundEffects.length === 0) {
      return NextResponse.json({ error: 'No sound effects found for this scene' }, { status: 404 });
    }

    // Filter to only the selected sound effects
    const selectedEffects = soundEffects.filter(effect =>
      soundEffectIds.includes(effect.id)
    );

    if (selectedEffects.length === 0) {
      return NextResponse.json({ error: 'No matching sound effects found' }, { status: 404 });
    }

    logger.info('Found sound effects to export', { count: selectedEffects.length });

    // Create a zip file
    const zip = new JSZip();

    // Download each sound effect from S3 and add to zip
    for (const effect of selectedEffects) {
      try {
        if (!effect.file_path) {
          logger.warn('Sound effect missing file path, skipping', { effectId: effect.id });
          continue;
        }

        // Get file from S3
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: effect.file_path,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
          logger.warn('No file content from S3', { effectId: effect.id, filePath: effect.file_path });
          continue;
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Create a clean filename from the title
        const cleanTitle = effect.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = effect.timestamp_start ? `_${Math.floor(effect.timestamp_start)}s` : '';
        const filename = `${cleanTitle}${timestamp}.mp3`;

        // Add to zip
        zip.file(filename, buffer);

        logger.info('Added sound effect to zip', {
          effectId: effect.id,
          filename,
          size: buffer.length
        });

      } catch (error) {
        logger.error('Error adding sound effect to zip', {
          effectId: effect.id,
          error
        });
        // Continue with other files even if one fails
      }
    }

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    logger.info('Zip file generated', {
      sceneId,
      fileCount: Object.keys(zip.files).length,
      zipSize: zipBuffer.length
    });

    // Return the zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="sound-effects-scene-${sceneId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Error exporting sound effects', error);
    return NextResponse.json(
      { error: 'Failed to export sound effects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
