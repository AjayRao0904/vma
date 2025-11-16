"use client";

import { useRef, useEffect, useState } from "react";

interface PreviewModalProps {
  videoUrl: string;
  previewAudioUrl: string;
  sceneName: string;
  sceneStartTime: number;
  sceneEndTime: number;
  onClose: () => void;
}

export default function PreviewModal({
  videoUrl,
  previewAudioUrl,
  sceneName,
  sceneStartTime,
  sceneEndTime,
  onClose
}: PreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Set video to scene start on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = sceneStartTime;
    }
  }, [sceneStartTime]);

  // Sync audio with video
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

    const handlePlay = () => {
      const relativeTime = video.currentTime - sceneStartTime;
      audio.currentTime = Math.max(0, relativeTime);
      audio.play();
      setIsPlaying(true);
    };

    const handlePause = () => {
      audio.pause();
      setIsPlaying(false);
    };

    const handleSeeked = () => {
      const relativeTime = video.currentTime - sceneStartTime;
      if (relativeTime >= 0 && relativeTime <= sceneEndTime - sceneStartTime) {
        audio.currentTime = relativeTime;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Stop at scene end
      if (video.currentTime >= sceneEndTime) {
        video.pause();
        video.currentTime = sceneStartTime;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [sceneStartTime, sceneEndTime]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg w-[60vw] max-w-3xl max-h-[60vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-sm font-semibold text-white">Preview: {sceneName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center bg-black p-4">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain rounded-lg"
              controls={false}
            />

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="w-9 h-9 bg-[#D75C35] hover:bg-[#C14D2A] rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Time Display */}
                <div className="text-white font-mono text-sm">
                  {formatTime(currentTime)} / {formatTime(sceneEndTime)}
                </div>

                {/* Preview Badge */}
                <div className="flex-1 flex items-center justify-center gap-1.5 text-green-400">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium">Preview Mode - Audio Synced</span>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} src={previewAudioUrl} />
      </div>
    </div>
  );
}
