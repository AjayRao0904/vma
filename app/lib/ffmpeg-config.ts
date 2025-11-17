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
    // On Linux (production), prioritize system FFmpeg over ffmpeg-static
    // ffmpeg-static doesn't work reliably in Next.js production builds
    if (process.platform === 'linux') {
      try {
        const systemFfmpegPath = execSync('which ffmpeg').toString().trim();
        if (systemFfmpegPath && existsSync(systemFfmpegPath)) {
          ffmpeg.setFfmpegPath(systemFfmpegPath);
          console.log(`✅ Using system FFmpeg: ${systemFfmpegPath}`);
          return;
        }
      } catch {
        // which command failed, try common paths
        const commonPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
        for (const ffmpegPath of commonPaths) {
          if (existsSync(ffmpegPath)) {
            ffmpeg.setFfmpegPath(ffmpegPath);
            console.log(`✅ Using system FFmpeg: ${ffmpegPath}`);
            return;
          }
        }
      }
    }

    // Try ffmpeg-static (for Windows/Mac development)
    try {
      let ffmpegStatic = require('ffmpeg-static');
      console.log('🔍 ffmpeg-static raw path:', ffmpegStatic);

      // Next.js/Turbopack may replace the path with a placeholder
      // If so, construct the real path manually
      if (ffmpegStatic.includes('\\ROOT\\') || ffmpegStatic.includes('/ROOT/')) {
        const resolvedPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
        console.log('🔧 Fixing Next.js path transformation:', resolvedPath);
        ffmpegStatic = resolvedPath;
      }

      console.log('🔍 Final path:', ffmpegStatic);
      console.log('🔍 File exists:', existsSync(ffmpegStatic));

      if (ffmpegStatic && existsSync(ffmpegStatic)) {
        ffmpeg.setFfmpegPath(ffmpegStatic);
        console.log(`✅ Using ffmpeg-static: ${ffmpegStatic}`);
        return;
      } else {
        console.log('⚠️ ffmpeg-static found but file does not exist');
      }
    } catch (error: any) {
      console.log('❌ ffmpeg-static error:', error.message);
      console.log('   Trying system FFmpeg...');
    }

    // Windows - try 'where' command
    if (process.platform === 'win32') {
      try {
        const systemFfmpegPath = execSync('where ffmpeg').toString().trim().split('\n')[0];
        if (systemFfmpegPath && existsSync(systemFfmpegPath)) {
          ffmpeg.setFfmpegPath(systemFfmpegPath);
          console.log(`✅ Using system FFmpeg: ${systemFfmpegPath}`);
          return;
        }
      } catch {
        // where command failed
      }
    }

    console.warn('⚠️ FFmpeg not found. Video cutting will not work.');
  } catch (error) {
    console.error('❌ Failed to configure FFmpeg:', error);
  }
}

// Auto-configure on import
configureFfmpeg();
