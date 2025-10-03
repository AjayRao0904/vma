import { useState, useCallback, useRef } from 'react';

interface ThumbnailData {
  thumbnails: string[];
  timestamps: number[];
  duration: number;
}

interface UseThumbnailGeneratorOptions {
  thumbnailCount?: number;
  quality?: number;
  width?: number;
  height?: number;
}

export const useThumbnailGenerator = (options: UseThumbnailGeneratorOptions = {}) => {
  const {
    thumbnailCount = 10,
    quality = 0.8,
    width = 160,
    height = 90,
  } = options;

  const [thumbnailData, setThumbnailData] = useState<ThumbnailData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateThumbnails = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!videoElement || !videoElement.duration) {
      setError('Invalid video element or duration');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Create canvas if it doesn't exist
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const duration = videoElement.duration;
      const interval = duration / (thumbnailCount + 1); // +1 to avoid the very end
      const thumbnails: string[] = [];
      const timestamps: number[] = [];

      // Generate thumbnails at regular intervals
      for (let i = 1; i <= thumbnailCount; i++) {
        const timestamp = interval * i;
        timestamps.push(timestamp);

        // Seek to timestamp
        videoElement.currentTime = timestamp;

        // Wait for video to seek
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            videoElement.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          videoElement.addEventListener('seeked', handleSeeked);
        });

        // Draw frame to canvas
        ctx.drawImage(videoElement, 0, 0, width, height);
        
        // Convert to data URL
        const thumbnail = canvas.toDataURL('image/jpeg', quality);
        thumbnails.push(thumbnail);

        // Update progress
        setProgress((i / thumbnailCount) * 100);

        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setThumbnailData({
        thumbnails,
        timestamps,
        duration,
      });

      setProgress(100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate thumbnails';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [thumbnailCount, quality, width, height]);

  const getThumbnailAtTime = useCallback((time: number): string | null => {
    if (!thumbnailData) return null;

    // Find the closest thumbnail
    let closestIndex = 0;
    let closestDiff = Math.abs(thumbnailData.timestamps[0] - time);

    for (let i = 1; i < thumbnailData.timestamps.length; i++) {
      const diff = Math.abs(thumbnailData.timestamps[i] - time);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return thumbnailData.thumbnails[closestIndex];
  }, [thumbnailData]);

  const reset = useCallback(() => {
    setThumbnailData(null);
    setIsGenerating(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    thumbnailData,
    isGenerating,
    progress,
    error,
    generateThumbnails,
    getThumbnailAtTime,
    reset,
  };
};