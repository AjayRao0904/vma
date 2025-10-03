import { NextResponse } from 'next/server';
import { listTempVideos, ensureTempVideosDir } from '../../utils/videoStorage';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Ensure directory exists
    await ensureTempVideosDir();
    
    // Check directory status
    const tempDir = 'C:\\tempvideos';
    let dirExists = false;
    try {
      const stats = await fs.stat(tempDir);
      dirExists = stats.isDirectory();
    } catch (error) {
      console.error('Directory check failed:', error);
    }

    // List videos
    const videos = await listTempVideos();

    return NextResponse.json({
      status: 'ok',
      tempVideosDirectory: tempDir,
      directoryExists: dirExists,
      videoCount: videos.length,
      videos: videos.map(fileName => ({
        fileName,
        url: `/api/video/${encodeURIComponent(fileName)}`
      }))
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}