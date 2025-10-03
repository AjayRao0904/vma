import { promises as fs } from 'fs';
import path from 'path';

const TEMP_VIDEOS_DIR = 'C:\\tempvideos';

// Ensure the temp videos directory exists
export async function ensureTempVideosDir() {
  try {
    await fs.mkdir(TEMP_VIDEOS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating temp videos directory:', error);
  }
}

// Save video file to local storage
export async function saveVideoToLocal(file: File, projectId?: string): Promise<string> {
  await ensureTempVideosDir();
  
  const fileExtension = path.extname(file.name) || '.mp4';
  const fileName = `${projectId || 'video'}_${Date.now()}${fileExtension}`;
  const filePath = path.join(TEMP_VIDEOS_DIR, fileName);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    
    console.log('Video saved to:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error saving video to local storage:', error);
    throw error;
  }
}

// Get video file path for serving
export function getVideoPath(fileName: string): string {
  return path.join(TEMP_VIDEOS_DIR, fileName);
}

// List all videos in temp directory
export async function listTempVideos(): Promise<string[]> {
  try {
    await ensureTempVideosDir();
    const files = await fs.readdir(TEMP_VIDEOS_DIR);
    return files.filter(file => 
      file.endsWith('.mp4') || 
      file.endsWith('.mov') || 
      file.endsWith('.avi') || 
      file.endsWith('.webm')
    );
  } catch (error) {
    console.error('Error listing temp videos:', error);
    return [];
  }
}

// Delete video file
export async function deleteVideo(fileName: string): Promise<boolean> {
  try {
    const filePath = path.join(TEMP_VIDEOS_DIR, fileName);
    await fs.unlink(filePath);
    console.log('Video deleted:', filePath);
    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
}

// Get video URL for client-side playback
export function getVideoUrl(fileName: string): string {
  return `/api/video/${encodeURIComponent(fileName)}`;
}