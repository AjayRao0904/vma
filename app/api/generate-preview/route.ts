import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import db from '../../lib/db';
import { logger } from '../../lib/logger';
import { BUCKET_NAME } from '../../lib/s3';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import https from 'https';
import fs from 'fs';

// Use centralized FFmpeg configuration
import '../../lib/ffmpeg-config';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * POST /api/generate-preview
 * Generate a preview track by mixing music with sound effects at specific timestamps
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sceneId, musicTrackId, soundEffectIds } = body;

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    logger.info('Generating preview track', { sceneId, musicTrackId, soundEffectIds });

    // Get scene
    const scene = await db.getSceneById(sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    const sceneDuration = scene.end_time - scene.start_time;

    // Download files from S3 to temp directory
    const tempDir = tmpdir();
    const tempFiles: string[] = [];
    let musicFile: string | null = null;

    try {
      // Get music track if provided
      if (musicTrackId) {
        const musicTracks = await db.getAudioVariationsBySceneId(sceneId);
        const musicTrack = musicTracks.find((t: any) => t.id === musicTrackId);

        if (musicTrack?.file_path) {
          const musicPath = path.join(tempDir, `music-${uuidv4()}.mp3`);
          await downloadFromS3(musicTrack.file_path, musicPath);
          musicFile = musicPath;
          tempFiles.push(musicPath);
        }
      }

      // Get sound effects
      const soundEffects: Array<{ file: string; timestamp: number }> = [];

      if (soundEffectIds && soundEffectIds.length > 0) {
        const allEffects = await db.getSoundEffectsBySceneId(sceneId);
        const selectedEffects = allEffects.filter((e: any) => soundEffectIds.includes(e.id));

        for (const effect of selectedEffects) {
          if (effect.file_path) {
            const effectPath = path.join(tempDir, `sfx-${uuidv4()}.mp3`);
            await downloadFromS3(effect.file_path, effectPath);
            soundEffects.push({
              file: effectPath,
              timestamp: parseFloat(effect.timestamp_start) || 0
            });
            tempFiles.push(effectPath);
          }
        }
      }

      // Generate preview track
      const outputPath = path.join(tempDir, `preview-${uuidv4()}.mp3`);
      tempFiles.push(outputPath);

      if (!musicFile && soundEffects.length === 0) {
        return NextResponse.json({ error: 'No audio to preview' }, { status: 400 });
      }

      await mixAudioTracks(musicFile, soundEffects, sceneDuration, outputPath);

      // Upload to S3
      const s3Key = `preview/${sceneId}/${uuidv4()}.mp3`;
      const fileBuffer = await fs.promises.readFile(outputPath);

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'audio/mpeg',
      }));

      // Save to database using raw query (preview_tracks doesn't have a helper method yet)
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });

      await pool.query(
        `INSERT INTO preview_tracks (scene_id, file_path, music_track_id, sound_effect_ids)
         VALUES ($1, $2, $3, $4)`,
        [sceneId, s3Key, musicTrackId || null, soundEffectIds || []]
      );

      await pool.end();

      // Get presigned URL
      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        }),
        { expiresIn: 3600 }
      );

      logger.info('Preview track generated', { s3Key });

      return NextResponse.json({
        success: true,
        previewUrl: presignedUrl,
        s3Key
      });

    } finally {
      // Cleanup temp files
      for (const file of tempFiles) {
        try {
          await unlink(file);
        } catch (error) {
          logger.warn('Failed to delete temp file', { file });
        }
      }
    }

  } catch (error) {
    logger.error('Error generating preview', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to download file from S3
async function downloadFromS3(s3Key: string, destPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const { Body } = await s3Client.send(command);

  if (!Body) throw new Error('No body in S3 response');

  const writeStream = fs.createWriteStream(destPath);

  // @ts-ignore
  await new Promise((resolve, reject) => {
    // @ts-ignore
    Body.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// Helper function to mix audio tracks using FFmpeg
async function mixAudioTracks(
  musicFile: string | null,
  soundEffects: Array<{ file: string; timestamp: number }>,
  duration: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // If only music, no sound effects - simple copy
    if (musicFile && soundEffects.length === 0) {
      command
        .input(musicFile)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          logger.info('Audio copy completed (music only)');
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', err);
          reject(err);
        })
        .run();
      return;
    }

    // If only sound effects, no music - use silence as base
    if (!musicFile && soundEffects.length > 0) {
      command.input(`anullsrc=r=44100:cl=stereo:d=${duration}`).inputFormat('lavfi');
    } else if (musicFile) {
      command.input(musicFile);
    }

    // Add all sound effects
    soundEffects.forEach(effect => {
      command.input(effect.file);
    });

    // Build complex filter for mixing
    let filterComplex = '';
    const baseInput = musicFile ? '[0:a]' : '[0]';

    // Add each sound effect with adelay
    soundEffects.forEach((effect, index) => {
      const inputIndex = index + 1; // Sound effects start at index 1
      const delayMs = Math.floor(effect.timestamp * 1000);
      filterComplex += `[${inputIndex}:a]adelay=${delayMs}|${delayMs}[sfx${index}];`;
    });

    // Mix all tracks together
    const mixInputs = soundEffects.map((_, index) => `[sfx${index}]`).join('');
    const totalInputs = soundEffects.length + 1; // base + sound effects
    filterComplex += `${baseInput}${mixInputs}amix=inputs=${totalInputs}:duration=first:dropout_transition=2[out]`;

    logger.info('FFmpeg filter', { filterComplex });

    command
      .complexFilter(filterComplex)
      .outputOptions('-map', '[out]')
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .duration(duration)
      .output(outputPath)
      .on('end', () => {
        logger.info('Audio mixing completed');
        resolve();
      })
      .on('error', (err) => {
        logger.error('FFmpeg error', err);
        reject(err);
      })
      .run();
  });
}
