import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3, generateAudioKey } from '../../lib/s3';
import { tmpdir } from 'os';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { logger } from '../../lib/logger';

/**
 * POST /api/generate-music
 * Generate music using ElevenLabs Music API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { sceneId, prompt, bpm } = body;

    if (!sceneId || !prompt) {
      return NextResponse.json({ error: 'Scene ID and prompt required' }, { status: 400 });
    }

    // Validate BPM if provided
    if (bpm !== undefined && (isNaN(bpm) || bpm < 40 || bpm > 200)) {
      return NextResponse.json({ error: 'BPM must be between 40 and 200' }, { status: 400 });
    }

    // Get scene from database
    const scene = await db.getSceneById(sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    logger.info('Generating music for scene', { sceneName: scene.name, sceneId, prompt, bpm });

    // Calculate scene duration in milliseconds
    const sceneDurationRaw = (parseFloat(scene.end_time) - parseFloat(scene.start_time)) * 1000;
    // ElevenLabs requires minimum 10 seconds (10000ms)
    const sceneDuration = Math.max(10000, Math.round(sceneDurationRaw));

    logger.info('Scene and music duration', { sceneDurationRawMs: sceneDurationRaw, musicDurationMs: sceneDuration, bpm });

    // Validate API key
    if (!process.env.ELEVENLABS_API_KEY) {
      logger.error('ElevenLabs API key not configured', new Error('ElevenLabs API key not configured'));
      return NextResponse.json({
        error: 'Music generation service not configured',
        details: 'API key missing'
      }, { status: 500 });
    }

    // Build request body with optional BPM
    const requestBody: any = {
      prompt: prompt,
      music_length_ms: sceneDuration
    };

    // Add BPM to prompt if provided (ElevenLabs responds to BPM in prompt)
    if (bpm) {
      requestBody.prompt = `${prompt}. ${bpm} BPM.`;
    }

    logger.info('ElevenLabs request', {
      endpoint: 'https://api.elevenlabs.io/v1/music/compose',
      body: requestBody
    });

    // Call ElevenLabs Music API
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/music/compose', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    logger.info('ElevenLabs response status', { status: elevenlabsResponse.status });

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      logger.error('ElevenLabs API error response', new Error('ElevenLabs API error'), {
        status: elevenlabsResponse.status,
        statusText: elevenlabsResponse.statusText,
        body: errorText
      });
      return NextResponse.json({
        error: 'Music generation failed',
        details: `Status ${elevenlabsResponse.status}: ${errorText}`
      }, { status: elevenlabsResponse.status });
    }

    // Get audio buffer from response
    // ElevenLabs returns audio/mpeg content type
    const contentType = elevenlabsResponse.headers.get('content-type');
    logger.info('Response content-type', { contentType });

    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    logger.info('Music generated successfully', { sizeBytes: buffer.length });

    if (buffer.length === 0) {
      logger.error('Received empty audio buffer from ElevenLabs', new Error('Received empty audio buffer from ElevenLabs'));
      return NextResponse.json({
        error: 'Music generation failed',
        details: 'Received empty audio file'
      }, { status: 500 });
    }

    // Get project info for S3 folder structure
    const project = await db.getProjectById(scene.project_id);
    const userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    // Save to temp directory
    const tempDir = path.join(tmpdir(), 'aalap-audio', user.id, scene.project_id);
    await mkdir(tempDir, { recursive: true });
    const tempFileName = `${sceneId}_${Date.now()}.mp3`;
    const tempFilePath = path.join(tempDir, tempFileName);
    await writeFile(tempFilePath, buffer);

    logger.info('Audio saved to temp', { tempFilePath });

    // Upload to S3
    const s3Key = generateAudioKey(
      user.id,
      scene.project_id,
      sceneId,
      tempFileName,
      userName,
      project?.name
    );
    await uploadToS3(buffer, s3Key, 'audio/mpeg');

    logger.info('Audio uploaded to S3', { s3Key });

    // Save to database with BPM
    const audioRecord = await db.createAudioVariation({
      scene_id: sceneId,
      title: `Generated Music - ${new Date().toLocaleTimeString()}`,
      file_path: s3Key,
      duration: (sceneDuration / 1000).toFixed(2), // Convert to seconds
      prompt: prompt,
      bpm: bpm || null
    });

    logger.info('Audio record created in database', { audioRecordId: audioRecord.id });

    return NextResponse.json({
      success: true,
      audioId: audioRecord.id,
      audioPath: s3Key,
      duration: audioRecord.duration,
      message: 'Music generated successfully!'
    });

  } catch (error) {
    logger.error('Error generating music', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to generate music', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
