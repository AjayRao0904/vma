import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVideoPlayerOptions {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
}

export const useVideoPlayer = (options: UseVideoPlayerOptions = {}) => {
  const { onTimeUpdate, autoPlay = false } = options;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update progress calculation
  const updateProgress = useCallback((time: number, dur: number) => {
    if (dur && !isNaN(dur) && isFinite(dur)) {
      setCurrentTime(time);
      setDuration(dur);
      setProgress((time / dur) * 100);
      
      if (onTimeUpdate) {
        onTimeUpdate(time, dur);
      }
    }
  }, [onTimeUpdate]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      setIsPlaying(true);
      
      // Force immediate progress update before play starts
      if (video.duration && !isNaN(video.duration)) {
        updateProgress(video.currentTime, video.duration);
      }
      
      video.play()
        .then(() => {
          // Additional update after play starts
          if (video.duration && !isNaN(video.duration)) {
            updateProgress(video.currentTime, video.duration);
          }
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [updateProgress]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    updateProgress(time, video.duration);
  }, [updateProgress]);

  // Seek by progress percentage
  const seekByProgress = useCallback((progressPercent: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const newTime = (progressPercent / 100) * video.duration;
    seek(newTime);
  }, [seek]);

  // Volume controls
  const setVolumeLevel = useCallback((level: number) => {
    const video = videoRef.current;
    if (!video) return;

    const volumeLevel = Math.max(0, Math.min(100, level));
    setVolume(volumeLevel);
    video.volume = volumeLevel / 100;
    video.muted = volumeLevel === 0;
    setIsMuted(volumeLevel === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (isScrubbing) return;
      updateProgress(video.currentTime, video.duration);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      updateProgress(video.currentTime, video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      updateProgress(video.currentTime, video.duration);
    };

    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadstart', handleLoadStart);

    // Initialize if metadata already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [updateProgress, isScrubbing]);

  // Auto-play effect
  useEffect(() => {
    if (!autoPlay) return;
    
    const video = videoRef.current;
    if (video && video.src && video.readyState >= 1 && video.paused) {
      video.play().catch(() => {});
    }
  }, [autoPlay]);

  // Initialize volume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.volume = volume / 100;
    video.muted = isMuted;
  }, [volume, isMuted]);

  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    isScrubbing,
    isLoading,
    togglePlayback,
    seek,
    seekByProgress,
    setVolumeLevel,
    toggleMute,
    setIsScrubbing,
  };
};