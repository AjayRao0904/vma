import { NextRequest, NextResponse } from 'next/server';
import { saveVideoToLocal } from '../../utils/videoStorage';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Save video to local storage
    const filePath = await saveVideoToLocal(file, projectId);
    const fileName = path.basename(filePath);

    console.log('Video saved:', { filePath, fileName });

    return NextResponse.json({
      success: true,
      fileName,
      filePath,
      size: file.size,
      type: file.type,
      url: `/api/video/${encodeURIComponent(fileName)}`
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}

// Get list of uploaded videos
export async function GET() {
  try {
    const { listTempVideos } = await import('../../utils/videoStorage');
    const videos = await listTempVideos();
    
    return NextResponse.json({
      videos: videos.map(fileName => ({
        fileName,
        url: `/api/video/${fileName}`
      }))
    });
  } catch (error) {
    console.error('Error listing videos:', error);
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 });
  }
}