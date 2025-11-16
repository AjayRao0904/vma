"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useProject } from "../../contexts/ProjectContext";
import { logger } from "../../lib/logger";

interface VideoUploadProps {
  onUploadComplete: (videoUrl: string, duration: number, videoId: string, scriptContent?: string) => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const { currentProject } = useProject();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [scriptContent, setScriptContent] = useState<string>("");

  const onVideoDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    setVideoFile(file);
    setError(null);
    logger.info('Video file selected', { name: file.name, size: file.size });
  }, []);

  const onScriptDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    setScriptFile(file);

    // Read script content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setScriptContent(content);
      logger.info('Script file loaded', { name: file.name, contentLength: content.length });
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!videoFile || !currentProject) {
      setError("Please select a video file");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Upload video
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('projectId', currentProject.id);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      logger.info('Video uploaded successfully', { videoId: data.videoId });

      setProgress(75);

      // Get presigned URL for video
      const urlResponse = await fetch('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Keys: [data.s3Key] })
      });
      const urlData = await urlResponse.json();
      const presignedUrl = urlData.urls[data.s3Key];

      // Get duration from video element
      logger.info('Getting duration from video element...');
      const video = document.createElement('video');
      video.src = presignedUrl;
      let duration = 0;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          duration = video.duration;
          logger.info('Duration from video element:', duration);
          resolve();
        };
        video.onerror = () => {
          logger.error('Failed to load video metadata');
          resolve();
        };
      });

      setProgress(100);

      // Notify parent with video URL, video ID, and optional script content
      onUploadComplete(presignedUrl, duration, data.videoId, scriptContent || undefined);

    } catch (err) {
      logger.error('Video upload error', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [videoFile, currentProject, scriptContent, onUploadComplete]);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const { getRootProps: getScriptRootProps, getInputProps: getScriptInputProps, isDragActive: isScriptDragActive } = useDropzone({
    onDrop: onScriptDrop,
    accept: {
      'text/*': ['.txt', '.pdf', '.doc', '.docx']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div className="w-full flex items-center justify-center min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Upload Your Files</h2>
          <p className="text-gray-400">
            Start by uploading your video. Optionally add a script for better AI analysis.
          </p>
        </div>

        {/* Dual Dropzones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Video Dropzone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video File <span className="text-[#D75C35]">*</span>
            </label>
            <div
              {...getVideoRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isVideoDragActive
                  ? 'border-[#D75C35] bg-[#D75C35]/10'
                  : videoFile
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-700 hover:border-[#D75C35] hover:bg-[#1A1A1A]'
              }`}
            >
              <input {...getVideoInputProps()} />
              <svg
                className={`w-12 h-12 mx-auto mb-3 ${videoFile ? 'text-green-500' : 'text-gray-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {videoFile ? (
                <>
                  <p className="text-sm font-medium text-green-500 mb-1">Video Selected</p>
                  <p className="text-xs text-gray-400 truncate">{videoFile.name}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white mb-1">
                    {isVideoDragActive ? 'Drop video here' : 'Drop video or click'}
                  </p>
                  <p className="text-xs text-gray-500">MP4, MOV, AVI, MKV, WebM</p>
                </>
              )}
            </div>
          </div>

          {/* Script Dropzone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Script (Optional)
            </label>
            <div
              {...getScriptRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isScriptDragActive
                  ? 'border-[#D75C35] bg-[#D75C35]/10'
                  : scriptFile
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-[#D75C35] hover:bg-[#1A1A1A]'
              }`}
            >
              <input {...getScriptInputProps()} />
              <svg
                className={`w-12 h-12 mx-auto mb-3 ${scriptFile ? 'text-blue-500' : 'text-gray-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {scriptFile ? (
                <>
                  <p className="text-sm font-medium text-blue-500 mb-1">Script Selected</p>
                  <p className="text-xs text-gray-400 truncate">{scriptFile.name}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white mb-1">
                    {isScriptDragActive ? 'Drop script here' : 'Drop script or click'}
                  </p>
                  <p className="text-xs text-gray-500">TXT, PDF, DOC, DOCX</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload Button */}
        {!uploading && (
          <button
            onClick={handleUpload}
            disabled={!videoFile}
            className="w-full bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-6 py-4 text-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload & Continue
          </button>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-[#D75C35] border-t-transparent rounded-full animate-spin" />
            <div className="text-white font-medium text-center">Uploading Video...</div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#D75C35] h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-400 text-center">{progress}%</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-500 text-center">{error}</p>
          </div>
        )}

        {/* Info */}
        {!uploading && (
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Maximum file size: 500MB • Video is required, script is optional</p>
          </div>
        )}
      </div>
    </div>
  );
}
