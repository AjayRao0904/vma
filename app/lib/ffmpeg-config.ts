import ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Configure FFmpeg path based on environment
 * - Production (Linux/EC2): Use system FFmpeg at /usr/bin/ffmpeg
 * - Development (Windows/Mac): Use ffmpeg-static package
 */
export function configureFfmpeg(): void {
  try {
    // Check if we're on Linux (production)
    if (process.platform === 'linux') {
      // Try to find system FFmpeg
      try {
        const systemFfmpegPath = execSync('which ffmpeg').toString().trim();
        if (systemFfmpegPath && existsSync(systemFfmpegPath)) {
          ffmpeg.setFfmpegPath(systemFfmpegPath);
          console.log(`Using system FFmpeg: ${systemFfmpegPath}`);
          return;
        }
      } catch {
        // which command failed, try common paths
        const commonPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
        for (const ffmpegPath of commonPaths) {
          if (existsSync(ffmpegPath)) {
            ffmpeg.setFfmpegPath(ffmpegPath);
            console.log(`Using system FFmpeg: ${ffmpegPath}`);
            return;
          }
        }
      }
    }

    // Fallback to ffmpeg-static for Windows/Mac development
    try {
      const ffmpegStatic = require('ffmpeg-static');
      if (ffmpegStatic && existsSync(ffmpegStatic)) {
        ffmpeg.setFfmpegPath(ffmpegStatic);
        console.log(`Using ffmpeg-static: ${ffmpegStatic}`);
        return;
      }
    } catch (error) {
      console.warn('ffmpeg-static not available:', error);
    }

    throw new Error('FFmpeg not found. Please install FFmpeg or ffmpeg-static package.');
  } catch (error) {
    console.error('Failed to configure FFmpeg:', error);
    throw error;
  }
}

// Auto-configure on import
configureFfmpeg();
