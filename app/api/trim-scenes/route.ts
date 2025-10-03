import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get the correct ffmpeg path with proper resolution
let ffmpegPath: string;
try {
  const ffmpegStatic = require('ffmpeg-static');
  
  // Construct the correct absolute path since Next.js/Turbopack corrupts the path
  const projectRoot = process.cwd();
  const correctPath = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  // Use the path that actually exists
  ffmpegPath = existsSync(correctPath) ? correctPath : ffmpegStatic;
  
  if (!existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
  }
  
  console.log('Setting FFmpeg path to:', ffmpegPath);
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (error) {
  console.error('Failed to load ffmpeg-static:', error);
  throw new Error('FFmpeg not available');
}

interface SceneSelection {
  id: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  endPercent: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const scenesData = formData.get('scenes') as string;
    
    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }
    
    if (!scenesData) {
      return NextResponse.json({ error: 'No scenes data provided' }, { status: 400 });
    }
    
    const scenes: SceneSelection[] = JSON.parse(scenesData);
    
    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes to export' }, { status: 400 });
    }
    
    console.log(`Processing ${scenes.length} scenes for trimming`);
    
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Create directories
    const videoDir = path.join(process.cwd(), 'tempvideos', sessionId);
    const outputDir = path.join(process.cwd(), 'tempscenes', sessionId);
    const publicOutputDir = path.join(process.cwd(), 'public', 'scenes', sessionId);
    
    await mkdir(videoDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
    await mkdir(publicOutputDir, { recursive: true });
    
    // Save uploaded video
    const videoBytes = await videoFile.arrayBuffer();
    const videoPath = path.join(videoDir, 'source.mp4');
    await writeFile(videoPath, Buffer.from(videoBytes));
    
    console.log('Video saved to:', videoPath);
    
    // Process each scene
    const outputFiles: string[] = [];
    const sceneMetadata: any[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const outputFileName = `scene_${(i + 1).toString().padStart(2, '0')}.mp4`;
      const outputPath = path.join(publicOutputDir, outputFileName);
      const duration = scene.endTime - scene.startTime;
      
      console.log(`Processing scene ${i + 1}: ${scene.startTime}s to ${scene.endTime}s (duration: ${duration}s)`);
      
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .setStartTime(scene.startTime)
            .setDuration(duration)
            .output(outputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('start', (commandLine) => {
              console.log(`FFmpeg command for scene ${i + 1}:`, commandLine);
            })
            .on('progress', (progress) => {
              console.log(`Scene ${i + 1} progress: ${progress.percent?.toFixed(1) || 0}%`);
            })
            .on('end', () => {
              console.log(`Scene ${i + 1} completed successfully`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`Error processing scene ${i + 1}:`, err);
              reject(err);
            })
            .run();
        });
        
        // Verify output file was created
        if (existsSync(outputPath)) {
          const publicPath = `/scenes/${sessionId}/${outputFileName}`;
          outputFiles.push(publicPath);
          
          // Create scene metadata
          const sceneData = {
            id: `${sessionId}-${i + 1}`,
            name: `Scene ${i + 1}`,
            startTime: scene.startTime,
            endTime: scene.endTime,
            videoPath: publicPath,
            sessionId,
            createdAt: new Date().toISOString(),
            audioVariations: [{
              id: `${sessionId}-${i + 1}-variation-1`,
              title: 'Variation 1',
              duration: '00:05',
              isPlaying: false
            }]
          };
          
          sceneMetadata.push(sceneData);
          console.log(`Scene ${i + 1} saved to:`, outputPath);
        } else {
          console.error(`Scene ${i + 1} output file not found:`, outputPath);
        }
        
      } catch (error) {
        console.error(`Failed to process scene ${i + 1}:`, error);
        // Continue with other scenes even if one fails
      }
    }
    
    // Save scene metadata to tempscenes directory
    if (sceneMetadata.length > 0) {
      const metadataPath = path.join(outputDir, 'scenes.json');
      await writeFile(metadataPath, JSON.stringify(sceneMetadata, null, 2));
      console.log(`Scene metadata saved to:`, metadataPath);
    }

    // Clean up source video
    try {
      await unlink(videoPath);
      console.log('Source video cleaned up');
    } catch (error) {
      console.warn('Failed to clean up source video:', error);
    }
    
    console.log(`Successfully processed ${outputFiles.length} out of ${scenes.length} scenes`);
    
    return NextResponse.json({
      success: true,
      processedScenes: outputFiles.length,
      totalScenes: scenes.length,
      outputFiles,
      sessionId,
      sceneMetadata
    });
    
  } catch (error) {
    console.error('Error in trim-scenes API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
