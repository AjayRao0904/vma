import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '../../lib/db';
import Replicate from 'replicate';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { getPresignedUrl } from '../../lib/s3';
import { logger } from '../../lib/logger';
import {
  createUserTempDir,
  getUserTempSubDir,
  cleanupUserTempDir,
  getUserTempFilePath,
} from '../../lib/tempStorage';

// Auto-configure FFmpeg based on platform
import '../../lib/ffmpeg-config';

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * POST /api/analyze-scene
 * Analyzes a scene using LLaVA-13B vision model
 * Extracts frames every 5 seconds and analyzes visual features
 */
export async function POST(request: NextRequest) {
  let userTempDir: string | null = null;

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
    const { sceneId } = body;

    if (!sceneId) {
      return NextResponse.json({ error: 'Scene ID required' }, { status: 400 });
    }

    // Create user-specific temp directory
    userTempDir = await createUserTempDir(user.id.toString());

    // Get scene from database
    const scene = await db.getSceneById(sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Get project script analysis if available
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    let scriptAnalysis = null;
    try {
      const projectResult = await pool.query(
        'SELECT script_analysis FROM projects WHERE id = $1',
        [scene.project_id]
      );
      scriptAnalysis = projectResult.rows[0]?.script_analysis;
    } catch (error) {
      // Column might not exist, that's okay
      logger.warn('Could not fetch script analysis', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    await pool.end();

    logger.info('Analyzing scene', {
      userId: user.id.toString(),
      sceneId,
      sceneName: scene.name,
      hasScriptAnalysis: !!scriptAnalysis
    });

    // Get scene file from temp storage (or download from S3 if needed)
    const sceneDuration = parseFloat(scene.end_time) - parseFloat(scene.start_time);
    const sceneFilePath = await getSceneFile(scene);

    if (!sceneFilePath || !existsSync(sceneFilePath)) {
      logger.error('Scene file not found', new Error('Scene file not found'), { sceneFilePath, exists: sceneFilePath ? existsSync(sceneFilePath) : false });
      return NextResponse.json({
        error: 'Scene file not found. The scene may need to be re-exported.',
        details: `File path: ${sceneFilePath || 'null'}`
      }, { status: 404 });
    }

    // Extract frames every 5 seconds
    const frames = await extractFrames(sceneFilePath, sceneDuration);
    logger.info('Extracted frames from scene', { frameCount: frames.length });

    // Analyze each frame with LLaVA
    const analyses = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      logger.info('Analyzing frame', { frameNumber: i + 1, totalFrames: frames.length, timestamp: frame.timestamp });

      const analysis = await analyzeFrame(frame.path);

      // Save analysis to database
      await db.createSceneAnalysis({
        scene_id: sceneId,
        frame_timestamp: frame.timestamp,
        lighting: analysis.lighting,
        camera_angle: analysis.camera_angle,
        colors: analysis.colors,
        shot_type: analysis.shot_type,
        mood: analysis.mood,
        emotions: analysis.emotions,
        raw_analysis: analysis.raw
      });

      analyses.push({
        timestamp: frame.timestamp,
        ...analysis
      });

      // Clean up frame file
      await unlink(frame.path);
    }

    // Generate music prompt from all analyses (with script context if available)
    const musicPrompt = generateMusicPrompt(analyses, scene.name, scriptAnalysis);
    const analysisSummary = generateAnalysisSummary(analyses, scriptAnalysis);

    // Save music prompt to database
    await db.createMusicPrompt({
      scene_id: sceneId,
      prompt: musicPrompt,
      analysis_summary: analysisSummary
    });

    logger.info('Analysis complete for scene', { sceneName: scene.name, sceneId });

    // Format detailed analysis for display
    const detailedAnalysis = {
      framesAnalyzed: frames.length,
      sceneDuration: sceneDuration,
      visualFeatures: {
        dominantMood: getMostCommon(analyses.map(a => a.mood).filter(Boolean)),
        dominantLighting: getMostCommon(analyses.map(a => a.lighting).filter(Boolean)),
        dominantShotType: getMostCommon(analyses.map(a => a.shot_type).filter(Boolean)),
        dominantColor: getMostCommon(analyses.map(a => a.colors?.dominant_color).filter(Boolean))
      },
      frameByFrameAnalysis: analyses.map((a, i) => ({
        frame: i + 1,
        timestamp: a.timestamp,
        lighting: a.lighting,
        shot_type: a.shot_type,
        mood: a.mood,
        camera_angle: a.camera_angle
      }))
    };

    return NextResponse.json({
      success: true,
      sceneId,
      sceneName: scene.name,
      musicPrompt,
      detailedAnalysis,
      analyses
    });

  } catch (error) {
    logger.error('Error analyzing scene', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: 'Failed to analyze scene', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get scene file path from temp storage or download from S3
 */
async function getSceneFile(scene: any): Promise<string | null> {
  // If no file_path, this is "full scene mode" - get the original video
  if (!scene.file_path) {
    logger.info('Scene has no file_path (full scene mode), attempting to use original video', { sceneId: scene.id });

    // Get the original video from the database
    const video = await db.getVideoById(scene.video_id);
    if (!video) {
      logger.error('Video not found for scene', new Error('Video not found'), { sceneId: scene.id, videoId: scene.video_id });
      return null;
    }

    // Try to download from S3
    try {
      const tempDir = path.join(tmpdir(), 'aalap-videos-analysis', scene.project_id);
      await mkdir(tempDir, { recursive: true });

      const videoFileName = video.file_name;
      const videoPath = path.join(tempDir, videoFileName);

      // Check if already downloaded
      if (existsSync(videoPath)) {
        logger.info('Original video found in temp', { videoPath });
        return videoPath;
      }

      // Download from S3
      const presignedUrl = await getPresignedUrl(video.file_path, 3600);
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        logger.error('Failed to download video from S3', new Error('Failed to download video'), { status: response.status });
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(videoPath, buffer);
      logger.info('Original video downloaded from S3', { videoPath });

      return videoPath;
    } catch (error) {
      logger.error('Error downloading original video', error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  // Scene has file_path - normal scene mode
  const sessionId = scene.session_id;
  if (!sessionId) {
    logger.error('Scene missing session_id', new Error('Scene missing session_id'), { sceneId: scene.id });
    return null;
  }

  const tempDir = path.join(tmpdir(), 'aalap-scenes', sessionId);
  const sceneFileName = path.basename(scene.file_path);
  const scenePath = path.join(tempDir, sceneFileName);

  // Check if file exists in temp storage
  if (existsSync(scenePath)) {
    logger.info('Scene file found in temp storage', { scenePath });
    return scenePath;
  }

  // File not in temp, download from S3
  logger.info('Scene file not in temp, downloading from S3', { filePath: scene.file_path });

  try {
    // Create temp directory
    await mkdir(tempDir, { recursive: true });

    // Get pre-signed URL
    const presignedUrl = await getPresignedUrl(scene.file_path, 3600);

    // Download file from S3
    const response = await fetch(presignedUrl);
    if (!response.ok) {
      logger.error('Failed to download scene from S3', new Error('Failed to download scene from S3'), { status: response.status });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to temp directory
    await writeFile(scenePath, buffer);
    logger.info('Scene file downloaded from S3', { scenePath });

    return scenePath;
  } catch (error) {
    logger.error('Error downloading scene from S3', error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Extract frames from video every 5 seconds
 */
async function extractFrames(videoPath: string, duration: number): Promise<Array<{ path: string; timestamp: number }>> {
  const frames: Array<{ path: string; timestamp: number }> = [];
  const outputDir = path.join(tmpdir(), 'aalap-frames', Date.now().toString());
  await mkdir(outputDir, { recursive: true });

  // Calculate frame extraction times (every 5 seconds)
  const interval = 5; // seconds
  const timestamps: number[] = [];
  for (let t = 0; t < duration; t += interval) {
    timestamps.push(t);
  }

  // Extract each frame
  for (const timestamp of timestamps) {
    const framePath = path.join(outputDir, `frame_${timestamp.toFixed(0)}s.jpg`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(framePath),
          folder: outputDir,
          size: '1280x720'
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    if (existsSync(framePath)) {
      frames.push({ path: framePath, timestamp });
    }
  }

  return frames;
}

/**
 * Analyze a single frame using LLaVA-13B
 */
async function analyzeFrame(framePath: string): Promise<any> {
  // Read frame as base64
  const frameBuffer = await readFile(framePath);
  const base64Image = `data:image/jpeg;base64,${frameBuffer.toString('base64')}`;

  // Ask specific questions - LLaVA returns natural text, not JSON
  const prompt = `Describe this video frame in detail. Include:
- The lighting (bright, dim, dark, natural, artificial, golden hour)
- The camera angle (low angle, high angle, eye level, dutch angle)
- The dominant colors and their emotional impact
- The type of shot (close-up, medium shot, wide shot, long shot)
- The overall mood and atmosphere (tense, peaceful, dramatic, happy, sad, mysterious)
- Any visible emotions or feelings conveyed

Be specific and descriptive.`;

  try {
    const output = await replicate.run(
      "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
      {
        input: {
          image: base64Image,
          prompt: prompt,
          top_p: 1,
          max_tokens: 512,
          temperature: 0.2
        }
      }
    );

    // LLaVA returns an array of word tokens, join them
    const responseText = Array.isArray(output) ? output.join('') : String(output);
    logger.info('LLaVA full response', { responseText });

    // Parse the textual response to extract structured data
    const analysis = parseTextualAnalysis(responseText);

    return {
      lighting: analysis.lighting,
      camera_angle: analysis.camera_angle,
      colors: analysis.colors,
      shot_type: analysis.shot_type,
      mood: analysis.mood,
      emotions: analysis.emotions,
      raw: responseText
    };

  } catch (error) {
    logger.error('Error calling LLaVA', error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

/**
 * Parse textual analysis from LLaVA response (fallback when JSON parsing fails)
 */
function parseTextualAnalysis(text: string): any {
  const lowerText = text.toLowerCase();

  // Extract lighting
  let lighting = 'natural lighting';
  if (lowerText.includes('bright') || lowerText.includes('well-lit')) lighting = 'bright';
  else if (lowerText.includes('dim') || lowerText.includes('low light')) lighting = 'dim';
  else if (lowerText.includes('dark')) lighting = 'dark';
  else if (lowerText.includes('golden hour') || lowerText.includes('sunset')) lighting = 'golden hour';

  // Extract camera angle
  let camera_angle = 'eye level';
  if (lowerText.includes('low angle')) camera_angle = 'low angle';
  else if (lowerText.includes('high angle') || lowerText.includes('bird')) camera_angle = 'high angle';

  // Extract shot type
  let shot_type = 'medium shot';
  if (lowerText.includes('close') || lowerText.includes('closeup')) shot_type = 'close-up';
  else if (lowerText.includes('wide')) shot_type = 'wide shot';

  // Extract mood
  let mood = 'neutral';
  if (lowerText.includes('tense')) mood = 'tense';
  else if (lowerText.includes('peaceful') || lowerText.includes('calm')) mood = 'peaceful';
  else if (lowerText.includes('dramatic')) mood = 'dramatic';

  // Extract emotions
  let emotions = text.substring(0, 100); // Use first 100 chars as emotions

  // Extract colors
  const colors = { dominant_color: 'neutral' };
  if (lowerText.includes('red')) colors.dominant_color = 'red';
  else if (lowerText.includes('blue')) colors.dominant_color = 'blue';
  else if (lowerText.includes('green')) colors.dominant_color = 'green';

  return { lighting, camera_angle, shot_type, mood, emotions, colors };
}

/**
 * Generate music prompt from frame analyses
 * Following ElevenLabs Music best practices: simple, evocative keywords
 */
function generateMusicPrompt(analyses: any[], sceneName: string, scriptAnalysis?: any): string {
  // Aggregate insights from all frames
  const lightingModes = analyses.map(a => a.lighting).filter(Boolean);
  const moods = analyses.map(a => a.mood).filter(Boolean);
  const emotions = analyses.map(a => a.emotions).filter(Boolean);
  const colors = analyses.map(a => a.colors?.dominant_color).filter(Boolean);

  // Get most common values
  const dominantLighting = getMostCommon(lightingModes);
  const dominantMood = getMostCommon(moods);
  const dominantColor = getMostCommon(colors);

  let moodDescriptors: string[] = [];
  let instrumentSuggestions: string[] = [];
  let tempo = 'moderate';

  // Map visual mood to musical descriptors (ElevenLabs: simple, evocative keywords)
  if (dominantMood.includes('tense') || dominantMood.includes('dramatic')) {
    moodDescriptors = ['tense', 'suspenseful', 'building tension'];
    instrumentSuggestions = ['dissonant strings', 'pulsing sub-bass'];
    tempo = 'moderate to fast';
  } else if (dominantMood.includes('peaceful') || dominantMood.includes('calm')) {
    moodDescriptors = ['serene', 'tranquil', 'gentle'];
    instrumentSuggestions = ['soft piano', 'ambient pads'];
    tempo = 'slow';
  } else if (dominantMood.includes('happy') || dominantMood.includes('joy')) {
    moodDescriptors = ['uplifting', 'bright', 'joyful'];
    instrumentSuggestions = ['bright piano', 'acoustic guitar'];
    tempo = 'upbeat';
  } else if (dominantMood.includes('sad') || dominantMood.includes('melancholy')) {
    moodDescriptors = ['melancholic', 'somber', 'reflective'];
    instrumentSuggestions = ['cello', 'soft piano'];
    tempo = 'slow';
  } else {
    moodDescriptors = ['atmospheric', 'cinematic'];
    instrumentSuggestions = ['ambient synths', 'orchestral elements'];
  }

  // Lighting influence
  if (dominantLighting.includes('dark')) {
    moodDescriptors.push('dark');
  } else if (dominantLighting.includes('golden')) {
    moodDescriptors.push('warm');
  }

  // Color influence
  if (dominantColor.includes('red')) {
    moodDescriptors.push('intense');
  } else if (dominantColor.includes('blue')) {
    moodDescriptors.push('ethereal');
  }

  // Enhance with script context if available
  let scriptContext = '';
  if (scriptAnalysis?.scenes) {
    // Try to find matching scene in script analysis
    const matchingScene = scriptAnalysis.scenes.find((s: any) =>
      s.description?.toLowerCase().includes(sceneName.toLowerCase()) ||
      sceneName.toLowerCase().includes(s.description?.toLowerCase())
    );

    if (matchingScene) {
      // Add script-based mood and music suggestions
      if (matchingScene.musicMood) {
        moodDescriptors.push(matchingScene.musicMood);
      }
      if (matchingScene.emotionalTone && !moodDescriptors.includes(matchingScene.emotionalTone)) {
        moodDescriptors.push(matchingScene.emotionalTone);
      }
      scriptContext = ` Scene context: ${matchingScene.description}.`;
    } else if (scriptAnalysis.overallMood) {
      // Use overall mood if no specific scene match
      moodDescriptors.push(scriptAnalysis.overallMood);
    }
  }

  // Build simple, evocative prompt (ElevenLabs best practice)
  const moodPhrase = moodDescriptors.slice(0, 4).join(', ');
  const instrumentPhrase = instrumentSuggestions.slice(0, 2).join(' with ');

  const prompt = `${moodPhrase} instrumental. ${instrumentPhrase}. ${tempo} tempo. Cinematic and emotional.${scriptContext}`;

  return prompt;
}

/**
 * Generate human-readable analysis summary
 */
function generateAnalysisSummary(analyses: any[], scriptAnalysis?: any): string {
  let summary = analyses.map((a, i) => {
    return `Frame ${i + 1} (${a.timestamp}s): ${a.lighting} lighting, ${a.shot_type} shot, ${a.mood} mood, ${a.emotions} emotions`;
  }).join('\n');

  // Add script context if available
  if (scriptAnalysis) {
    summary += `\n\n=== Script Context ===\n`;
    if (scriptAnalysis.summary) {
      summary += `Story: ${scriptAnalysis.summary}\n`;
    }
    if (scriptAnalysis.themes) {
      summary += `Themes: ${scriptAnalysis.themes.join(', ')}\n`;
    }
    if (scriptAnalysis.overallMood) {
      summary += `Overall Mood: ${scriptAnalysis.overallMood}\n`;
    }
  }

  return summary;
}

/**
 * Get most common element in array
 */
function getMostCommon(arr: string[]): string {
  if (arr.length === 0) return 'unknown';
  const counts = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
