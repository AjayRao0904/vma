import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getVideoPath } from '../../../utils/videoStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    const videoPath = getVideoPath(filename);
    
    console.log('Serving video:', { filename, videoPath });
    
    // Check if file exists
    try {
      await fs.access(videoPath);
      console.log('Video file exists:', videoPath);
    } catch {
      console.error('Video file not found:', videoPath);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get file stats
    const stats = await fs.stat(videoPath);
    const fileSize = stats.size;

    // Read the entire file as buffer
    const fileBuffer = await fs.readFile(videoPath);
    
    // Handle range requests for video streaming
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const chunk = new Uint8Array(fileBuffer.subarray(start, end + 1));

      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': getContentType(filename),
        },
      });
    } else {
      // Send entire file
      const uint8Array = new Uint8Array(fileBuffer);
      
      return new Response(uint8Array, {
        headers: {
          'Content-Type': getContentType(filename),
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    }
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.webm':
      return 'video/webm';
    default:
      return 'video/mp4';
  }
}