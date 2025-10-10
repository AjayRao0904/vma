import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import { uploadToS3, generateAudioKey } from '../../lib/s3';
import { tmpdir } from 'os';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { logger } from '../../lib/logger';

/**
 * POST /api/generate-sound-effect
 * Generate sound effect using ElevenLabs Sound Generation API
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
    const { sceneId, soundEffectName, soundEffectDescription } = body;

    if (!sceneId || !soundEffectName || !soundEffectDescription) {
      return NextResponse.json({ error: 'Scene ID, name, and description required' }, { status: 400 });
    }

    // Get scene from database
    const scene = await db.getSceneById(sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    logger.info('Sound effect generation request', {
      sceneName: scene.name,
      sceneId,
      soundEffectName,
      soundEffectDescription
    });

    // Validate API key
    if (!process.env.ELEVENLABS_API_KEY) {
      logger.error('ElevenLabs API key not configured');
      return NextResponse.json({
        error: 'Sound effect generation service not configured',
        details: 'API key missing'
      }, { status: 500 });
    }

    logger.info('API Key validated', {
      apiKeyPrefix: process.env.ELEVENLABS_API_KEY.substring(0, 10)
    });

    // Create prompt for ElevenLabs Sound Generation
    const soundPrompt = `${soundEffectName}. ${soundEffectDescription}`;

    // Build request body according to API spec
    const requestBody = {
      text: soundPrompt,
      duration_seconds: null,  // API accepts null to auto-determine duration
      prompt_influence: 0.3    // Default influence level
    };

    logger.info('Sending request to ElevenLabs', {
      url: 'https://api.elevenlabs.io/v1/sound-generation',
      method: 'POST',
      requestBody
    });

    // Call ElevenLabs Sound Generation API
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    logger.info('Response from ElevenLabs', {
      status: elevenlabsResponse.status,
      statusText: elevenlabsResponse.statusText,
      contentType: elevenlabsResponse.headers.get('content-type'),
      contentLength: elevenlabsResponse.headers.get('content-length')
    });

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();

      // Try to parse error as JSON for better error messages
      let detailedError = errorText;
      let errorDetails = null;
      try {
        const errorJson = JSON.parse(errorText);
        detailedError = errorJson.detail?.message || errorJson.message || errorJson.detail || errorText;
        errorDetails = errorJson;
        logger.error('ElevenLabs API error', errorJson, {
          status: elevenlabsResponse.status,
          statusText: elevenlabsResponse.statusText,
          requestPrompt: soundPrompt
        });
      } catch (e) {
        logger.error('ElevenLabs API error (non-JSON response)', new Error(errorText), {
          status: elevenlabsResponse.status,
          statusText: elevenlabsResponse.statusText,
          requestPrompt: soundPrompt
        });
      }

      return NextResponse.json({
        error: 'Sound effect generation failed',
        details: `Status ${elevenlabsResponse.status}: ${detailedError}`,
        rawError: errorDetails
      }, { status: elevenlabsResponse.status });
    }

    logger.info('Sound effect generated successfully');

    // Get audio buffer from response
    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    logger.info('Audio buffer received', {
      size: buffer.length,
      type: buffer.length > 0 ? 'MP3' : 'Empty'
    });

    if (buffer.length === 0) {
      logger.error('Received empty audio buffer from ElevenLabs');
      return NextResponse.json({
        error: 'Sound effect generation failed',
        details: 'Received empty audio file'
      }, { status: 500 });
    }

    // Get project info for S3 folder structure
    const project = await db.getProjectById(scene.project_id);
    const userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    // Save to temp directory
    const tempDir = path.join(tmpdir(), 'aalap-audio', user.id, scene.project_id);
    await mkdir(tempDir, { recursive: true });
    const tempFileName = `${sceneId}_${soundEffectName.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
    const tempFilePath = path.join(tempDir, tempFileName);
    await writeFile(tempFilePath, buffer);

    logger.info('Audio saved to temp directory', { tempFilePath });

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

    // Save to database as audio variation
    const audioRecord = await db.createAudioVariation({
      scene_id: sceneId,
      title: `${soundEffectName} - ${new Date().toLocaleTimeString()}`,
      file_path: s3Key,
      duration: 5, // Duration in seconds (numeric)
      prompt: soundPrompt
    });

    logger.info('Sound effect generation complete', {
      audioId: audioRecord.id,
      title: audioRecord.title,
      filePath: s3Key
    });

    return NextResponse.json({
      success: true,
      audioId: audioRecord.id,
      audioPath: s3Key,
      soundEffectName,
      message: 'Sound effect generated successfully!'
    });

  } catch (error) {
    logger.error('Error generating sound effect', error);
    return NextResponse.json(
      { error: 'Failed to generate sound effect', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
