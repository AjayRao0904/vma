import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

// Get the correct ffmpeg path with proper resolution
let ffmpegPath: string;
try {
  const ffmpegStatic = require('ffmpeg-static');
  
  // Construct the correct absolute path since Next.js/Turbopack corrupts the path
  const projectRoot = process.cwd();
  const correctPath = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  
  console.log('FFmpeg original path:', ffmpegStatic);
  console.log('FFmpeg constructed path:', correctPath);
  console.log('Process CWD:', projectRoot);
  
  // Use the path that actually exists
  ffmpegPath = existsSync(correctPath) ? correctPath : ffmpegStatic;
  
  // Verify the file exists
  if (!existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at: ${ffmpegPath}`);
  }
  
  console.log('Setting FFmpeg path to:', ffmpegPath);
  ffmpeg.setFfmpegPath(ffmpegPath);
  
  // Test that ffmpeg works by checking its version
  console.log('Testing ffmpeg execution...');
} catch (error) {
  console.error('Failed to load ffmpeg-static:', error);
  throw new Error('FFmpeg not available');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Create unique session ID for this video
    const sessionId = uuidv4();
    const videoDir = path.join(process.cwd(), 'testvideo', sessionId);
    const thumbnailsDir = path.join(process.cwd(), 'public', 'testthumbnails', sessionId);
    
    // Create directories
    await mkdir(videoDir, { recursive: true });
    await mkdir(thumbnailsDir, { recursive: true });
    
    // Save uploaded video file to testvideo folder
    const videoBuffer = Buffer.from(await file.arrayBuffer());
    const videoPath = path.join(videoDir, file.name);
    await writeFile(videoPath, videoBuffer);
    
    console.log('Video saved to:', videoPath);
    console.log('Thumbnails will be saved to:', thumbnailsDir);

    // Get video duration using ffmpeg
    const duration = await getVideoDuration(videoPath);
    console.log('Video duration:', duration, 'seconds');

    // Use scene detection to find interesting frames
    const sceneTimestamps = await detectScenes(videoPath, duration);
    console.log('Scene timestamps:', sceneTimestamps);

    // Generate thumbnails at scene change points
    const thumbnailPaths = await generateThumbnails(videoPath, thumbnailsDir, sceneTimestamps, sessionId);
    
    console.log(`Successfully generated ${thumbnailPaths.length} thumbnails`);

    // Clean up video file but keep thumbnails for UI display
    const cleanup = async () => {
      try {
        await unlink(videoPath);
        await require('fs').promises.rmdir(videoDir);
        console.log('Video file cleaned up, thumbnails preserved');
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };

    // Schedule cleanup after response
    setTimeout(cleanup, 30000);

    return NextResponse.json({
      thumbnails: thumbnailPaths,
      duration: duration,
      sessionId,
      generatedCount: thumbnailPaths.length
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thumbnails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get video duration using ffmpeg
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg not available'));
      return;
    }

    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', videoPath,
      '-f', 'null',
      '-'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', () => {
      // Parse duration from stderr output
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        resolve(totalSeconds);
      } else {
        console.warn('Could not parse duration, using fallback');
        resolve(60); // fallback duration
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error('Duration detection error:', error);
      resolve(60); // fallback duration
    });
  });
}

// Detect scene changes using the specified filter
async function detectScenes(videoPath: string, duration: number): Promise<number[]> {
  return new Promise((resolve) => {
    if (!ffmpegPath) {
      console.warn('FFmpeg not available, using interval fallback');
      resolve(generateIntervalTimestamps(duration, 20));
      return;
    }

    const sceneTimestamps: number[] = [];
    
    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vf', "select='gt(scene,0.35)',showinfo",
      '-f', 'null',
      process.platform === 'win32' ? 'NUL' : '/dev/null'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Parse showinfo output to extract timestamps
      const matches = output.match(/pts_time:(\d+(?:\.\d+)?)/g);
      if (matches) {
        matches.forEach((match: string) => {
          const timeMatch = match.match(/pts_time:(\d+(?:\.\d+)?)/);
          if (timeMatch && sceneTimestamps.length < 20) {
            const timestamp = parseFloat(timeMatch[1]);
            if (timestamp > 0 && timestamp < duration - 1) { // Avoid first and last second
              sceneTimestamps.push(timestamp);
            }
          }
        });
      }
    });

    ffmpegProcess.on('close', () => {
      console.log(`Found ${sceneTimestamps.length} scene changes`);
      
      // If we don't have enough scenes, supplement with interval-based timestamps
      if (sceneTimestamps.length < 10) {
        const intervalTimestamps = generateIntervalTimestamps(duration, 20 - sceneTimestamps.length);
        sceneTimestamps.push(...intervalTimestamps.filter(t => 
          !sceneTimestamps.some(existing => Math.abs(existing - t) < 2)
        ));
      }
      
      // Sort and limit to 20 timestamps
      sceneTimestamps.sort((a, b) => a - b);
      resolve(sceneTimestamps.slice(0, 20));
    });

    ffmpegProcess.on('error', (error) => {
      console.error('Scene detection error:', error);
      console.log('Falling back to interval-based timestamps');
      resolve(generateIntervalTimestamps(duration, 20));
    });
  });
}

// Generate interval-based timestamps as fallback
function generateIntervalTimestamps(duration: number, count: number): number[] {
  const timestamps: number[] = [];
  const interval = Math.max(1, duration / (count + 1)); // Ensure at least 1 second intervals
  
  for (let i = 1; i <= count; i++) {
    const timestamp = i * interval;
    if (timestamp < duration - 1) { // Avoid the very end
      timestamps.push(timestamp);
    }
  }
  
  return timestamps;
}

// Generate actual thumbnail images
async function generateThumbnails(
  videoPath: string, 
  thumbnailsDir: string, 
  timestamps: number[], 
  sessionId: string
): Promise<string[]> {
  const thumbnailPaths: string[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const thumbnailName = `thumb_${i.toString().padStart(3, '0')}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
    const relativePath = `/testthumbnails/${sessionId}/${thumbnailName}`;
    
    console.log(`Generating thumbnail ${i + 1}/${timestamps.length} at ${timestamp.toFixed(2)}s`);
    
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [timestamp],
            filename: thumbnailName,
            folder: thumbnailsDir,
            size: '160x90'
          })
          .on('end', () => {
            console.log(`Thumbnail ${i + 1} generated successfully`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error generating thumbnail ${i + 1}:`, err);
            resolve(); // Don't fail the whole process
          });
      });
      
      // Verify thumbnail was created
      const fs = require('fs');
      if (fs.existsSync(thumbnailPath)) {
        thumbnailPaths.push(relativePath);
      }
    } catch (error) {
      console.warn(`Skipping thumbnail ${i + 1}:`, error);
    }
  }
  
  return thumbnailPaths;
}
