import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { logger } from '../../lib/logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../lib/s3';
import JSZip from 'jszip';

/**
 * POST /api/export-audio
 * Export selected sound effects and music tracks as a zip file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sceneId, soundEffectIds = [], musicTrackIds = [] } = body;

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    if (soundEffectIds.length === 0 && musicTrackIds.length === 0) {
      return NextResponse.json({ error: 'No items selected for export' }, { status: 400 });
    }

    logger.info('Exporting audio', {
      sceneId,
      soundEffectCount: soundEffectIds.length,
      musicTrackCount: musicTrackIds.length
    });

    // Create a zip file
    const zip = new JSZip();

    // Create folders for organization
    const musicFolder = zip.folder('music');
    const sfxFolder = zip.folder('sound_effects');

    let exportedCount = 0;

    // Export sound effects
    if (soundEffectIds.length > 0) {
      const soundEffects = await db.getSoundEffectsBySceneId(sceneId);
      const selectedEffects = soundEffects.filter(effect =>
        soundEffectIds.includes(effect.id)
      );

      for (const effect of selectedEffects) {
        try {
          if (!effect.file_path) {
            logger.warn('Sound effect missing file path, skipping', { effectId: effect.id });
            continue;
          }

          // Get file from S3
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
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

          // Add to zip in sound_effects folder
          sfxFolder?.file(filename, buffer);
          exportedCount++;

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
        }
      }
    }

    // Export music tracks
    if (musicTrackIds.length > 0) {
      const musicTracks = await db.getAudioVariationsBySceneId(sceneId);
      const selectedTracks = musicTracks.filter(track =>
        musicTrackIds.includes(track.id)
      );

      for (let i = 0; i < selectedTracks.length; i++) {
        const track = selectedTracks[i];
        try {
          if (!track.file_path) {
            logger.warn('Music track missing file path, skipping', { trackId: track.id });
            continue;
          }

          // Get file from S3
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: track.file_path,
          });

          const response = await s3Client.send(command);

          if (!response.Body) {
            logger.warn('No file content from S3', { trackId: track.id, filePath: track.file_path });
            continue;
          }

          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of response.Body as any) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Create a clean filename
          const cleanPrompt = track.prompt
            ? track.prompt.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase()
            : `music_track_${i + 1}`;
          const filename = `${cleanPrompt}.mp3`;

          // Add to zip in music folder
          musicFolder?.file(filename, buffer);
          exportedCount++;

          logger.info('Added music track to zip', {
            trackId: track.id,
            filename,
            size: buffer.length
          });

        } catch (error) {
          logger.error('Error adding music track to zip', {
            trackId: track.id,
            error
          });
        }
      }
    }

    if (exportedCount === 0) {
      return NextResponse.json({ error: 'No files were added to export' }, { status: 404 });
    }

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    logger.info('Zip file generated', {
      sceneId,
      fileCount: exportedCount,
      zipSize: zipBuffer.length
    });

    // Return the zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="audio-export-scene-${sceneId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Error exporting audio', error);
    return NextResponse.json(
      { error: 'Failed to export audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
