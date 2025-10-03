import { useState, useCallback } from 'react';

interface UseVideoUploadOptions {
  onUploadComplete?: (videoUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const { onUploadComplete, onUploadError } = options;
  
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadVideo = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadedVideo(file);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const url = response.videoUrl || `/api/video/${file.name}`;
          setVideoUrl(url);
          setIsUploading(false);
          setUploadProgress(100);
          
          if (onUploadComplete) {
            onUploadComplete(url);
          }
        } else {
          const error = 'Upload failed';
          setUploadError(error);
          setIsUploading(false);
          
          if (onUploadError) {
            onUploadError(error);
          }
        }
      };

      // Handle errors
      xhr.onerror = () => {
        const error = 'Upload failed';
        setUploadError(error);
        setIsUploading(false);
        
        if (onUploadError) {
          onUploadError(error);
        }
      };

      // Send the request
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      setIsUploading(false);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  }, [onUploadComplete, onUploadError]);

  const resetUpload = useCallback(() => {
    setUploadedVideo(null);
    setVideoUrl('');
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type.startsWith('video/')) {
      uploadVideo(file);
    } else {
      const error = 'Please select a valid video file';
      setUploadError(error);
      if (onUploadError) {
        onUploadError(error);
      }
    }
  }, [uploadVideo, onUploadError]);

  return {
    uploadedVideo,
    videoUrl,
    uploadProgress,
    isUploading,
    uploadError,
    uploadVideo,
    resetUpload,
    handleFileSelect,
  };
};