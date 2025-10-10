import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import db from '../../lib/db';
import { uploadToS3, generateThumbnailKey, getPresignedUrl } from '../../lib/s3';
import { getServerSession } from 'next-auth';
import { logger } from '../../lib/logger';
import '../../lib/ffmpeg-config'; // Auto-configure FFmpeg

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const videoFileName = formData.get('videoFileName') as string;
    const videoId = formData.get('videoId') as string;
    const projectId = formData.get('projectId') as string;

    // Get project and user names for S3 structure
    let project = null;
    let userName = session.user.name || session.user.email?.split('@')[0] || 'user';

    if (projectId) {
      project = await db.getProjectById(projectId);
    }

    // Check if thumbnails already exist for this video
    if (videoId) {
      const existingThumbnails = await db.getThumbnailsByVideoId(videoId);
      if (existingThumbnails && existingThumbnails.length > 0) {
        logger.info('Thumbnails already exist for video, returning from cache', {
          videoId,
          count: existingThumbnails.length
        });

        // Get video duration from database
        const video = await db.getVideoById(videoId);
        const thumbnailPaths = existingThumbnails.map(t => t.file_path);

        return NextResponse.json({
          thumbnails: thumbnailPaths,
          duration: video?.duration || 0,
          sessionId: existingThumbnails[0].session_id,
          fromCache: true
        });
      }
    }

    let videoPath: string;
    let sessionId: string;
    let shouldCleanup = true;
    let tempVideoDir: string | null = null;

    // Create unique session ID for this video
    sessionId = uuidv4();
    const thumbnailsDir = path.join(tmpdir(), 'aalap-thumbnails', sessionId);

    // Create temporary thumbnails directory
    await mkdir(thumbnailsDir, { recursive: true });

    if (videoFileName) {
      // Look for video in project-specific temp directory
      if (!projectId) {
        return NextResponse.json({
          error: 'Project ID required for thumbnail generation'
        }, { status: 400 });
      }

      logger.info('Using existing video', { videoFileName });
      const tempVideoDir = path.join(tmpdir(), 'aalap-videos', user.id, projectId);
      videoPath = path.join(tempVideoDir, videoFileName);

      logger.info('Looking for video at path', { videoPath });

      if (!existsSync(videoPath)) {
        return NextResponse.json({
          error: 'Video file not found in temp storage',
          details: `Please re-upload the video. Looking for: ${videoPath}`
        }, { status: 404 });
      }
      shouldCleanup = false; // Don't delete the original video
    } else if (file) {
      // Handle uploaded file
      tempVideoDir = path.join(tmpdir(), 'aalap-videos', sessionId);
      await mkdir(tempVideoDir, { recursive: true });

      // Save uploaded video file to temp folder
      const videoBuffer = Buffer.from(await file.arrayBuffer());
      videoPath = path.join(tempVideoDir, file.name);
      await writeFile(videoPath, videoBuffer);
    } else {
      return NextResponse.json({ error: 'No video file or filename provided' }, { status: 400 });
    }

    logger.info('Thumbnail generation paths', {
      videoPath,
      thumbnailsDir
    });

    // Get video duration using ffmpeg
    const duration = await getVideoDuration(videoPath);
    logger.info('Video duration detected', { duration });

    // Use scene detection to find interesting frames
    const sceneTimestamps = await detectScenes(videoPath, duration);
    logger.info('Scene timestamps detected', {
      count: sceneTimestamps.length,
      timestamps: sceneTimestamps
    });

    // Generate thumbnails at scene change points
    const localThumbnailPaths = await generateThumbnails(videoPath, thumbnailsDir, sceneTimestamps, sessionId);

    logger.info('Thumbnails generated locally', {
      count: localThumbnailPaths.length
    });

    // Upload thumbnails to S3 and save to database
    const s3ThumbnailPaths: string[] = [];
    if (videoId && localThumbnailPaths.length > 0) {
      logger.info('Uploading thumbnails to S3', { videoId });

      for (let i = 0; i < localThumbnailPaths.length; i++) {
        try {
          const localPath = path.join(thumbnailsDir, path.basename(localThumbnailPaths[i]));

          // Read thumbnail file
          const thumbnailBuffer = await readFile(localPath);

          // Generate S3 key and upload with user and project names
          const s3Key = generateThumbnailKey(
            user.id,
            videoId,
            path.basename(localThumbnailPaths[i]),
            userName,
            projectId,
            project?.name
          );
          await uploadToS3(thumbnailBuffer, s3Key, 'image/jpeg');

          s3ThumbnailPaths.push(s3Key);
          logger.info('Thumbnail uploaded to S3', {
            index: i + 1,
            total: localThumbnailPaths.length,
            s3Key
          });

          // Save to database with S3 key
          await db.createThumbnail({
            video_id: videoId,
            file_path: s3Key,
            timestamp: sceneTimestamps[i],
            session_id: sessionId
          });
        } catch (error) {
          logger.error('Error uploading thumbnail', error, {
            index: i + 1,
            videoId
          });
          // Continue with other thumbnails even if one fails
        }
      }
      logger.info('Thumbnails uploaded and saved to database', {
        count: s3ThumbnailPaths.length,
        videoId
      });

      // Update video record with duration
      try {
        await db.updateVideo(videoId, { duration });
        logger.info('Video duration updated', { videoId, duration });
      } catch (dbError) {
        logger.error('Error updating video duration', dbError, { videoId });
      }
    }

    logger.info('Thumbnails uploaded to S3, temp files kept for reuse');

    return NextResponse.json({
      thumbnails: s3ThumbnailPaths,
      duration: duration,
      sessionId,
      generatedCount: s3ThumbnailPaths.length
    });

  } catch (error) {
    logger.error('Thumbnail generation error', error);
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
        logger.warn('Could not parse duration, using fallback', { videoPath });
        resolve(60); // fallback duration
      }
    });

    ffmpegProcess.on('error', (error) => {
      logger.error('Duration detection error', error, { videoPath });
      resolve(60); // fallback duration
    });
  });
}

// Detect scene changes using the specified filter
async function detectScenes(videoPath: string, duration: number): Promise<number[]> {
  return new Promise((resolve) => {
    if (!ffmpegPath) {
      logger.warn('FFmpeg not available, using interval fallback');
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
      logger.info('Scene changes detected', {
        count: sceneTimestamps.length,
        videoPath
      });

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
      logger.error('Scene detection error, falling back to interval-based timestamps', error, {
        videoPath,
        duration
      });
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
  const thumbnailFilenames: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const thumbnailName = `thumb_${i.toString().padStart(3, '0')}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

    logger.info('Generating thumbnail', {
      index: i + 1,
      total: timestamps.length,
      timestamp: timestamp.toFixed(2)
    });

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
            logger.info('Thumbnail generated successfully', {
              index: i + 1
            });
            resolve();
          })
          .on('error', (err) => {
            logger.error('Error generating thumbnail', err, {
              index: i + 1
            });
            resolve(); // Don't fail the whole process
          });
      });

      // Verify thumbnail was created
      const fs = require('fs');
      if (fs.existsSync(thumbnailPath)) {
        thumbnailFilenames.push(thumbnailName);
      }
    } catch (error) {
      logger.warn('Skipping thumbnail', {
        index: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return thumbnailFilenames;
}
