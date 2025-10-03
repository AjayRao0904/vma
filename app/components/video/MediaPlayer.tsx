'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

interface MediaPlayerProps {
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export default function MediaPlayer({ className = '', videoRef, onTimeUpdate }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar change
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef?.current;
    if (!video || !video.duration) return;

    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * video.duration;
    
    video.currentTime = newTime;
    setProgress(newProgress);
    setCurrentTime(newTime);
    
    if (onTimeUpdate) {
      onTimeUpdate(newTime, video.duration);
    }
  };

  // Toggle playbook
  const togglePlayback = useCallback(() => {
    const video = videoRef?.current;
    if (!video) return;

    if (video.paused || video.ended) {
      // Set playing state immediately
      setIsPlaying(true);
      
      // Force immediate progress update before play starts
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);
        
        if (onTimeUpdate) {
          onTimeUpdate(video.currentTime, video.duration);
        }
      }
      
      video.play()
        .then(() => {
          // Additional update after play starts
          if (video.duration && !isNaN(video.duration)) {
            setDuration(video.duration);
            setCurrentTime(video.currentTime);
            setProgress((video.currentTime / video.duration) * 100);
            
            if (onTimeUpdate) {
              onTimeUpdate(video.currentTime, video.duration);
            }
          }
        })
        .catch(() => {
          setIsPlaying(false); // Reset if play fails
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [videoRef, onTimeUpdate]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef?.current;
    if (!video) return;

    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume / 100;
    video.muted = newVolume === 0;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef?.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Initialize video event listeners
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    // Update time display
    const updateTime = () => {
      if (isScrubbing) return; // Don't update while scrubbing
      
      const current = video.currentTime || 0;
      const dur = video.duration;
      
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setCurrentTime(current);
        setDuration(dur);
        setProgress((current / dur) * 100);
        
        if (onTimeUpdate) {
          onTimeUpdate(current, dur);
        }
      }
    };

    // Event handlers
    const handlePlay = () => {
      setIsPlaying(true);
      // Force immediate progress update when play starts
      updateTime();
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      updateTime();
    };



    // Add event listeners
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Initialize if metadata already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, onTimeUpdate, isScrubbing]);

  // Auto-play when src changes
  useEffect(() => {
    const video = videoRef?.current;
    if (video && video.src && video.readyState >= 1 && video.paused) {
      video.play().catch(() => {}); // Silently handle autoplay errors
    }
  }, [videoRef?.current?.src]);

  // Force progress updates when playing starts
  useEffect(() => {
    if (!isPlaying) return;
    
    const video = videoRef?.current;
    if (!video) return;

    // Immediate update when playing starts
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    }

    // Set up rapid updates for the first second of playback
    const rapidUpdateInterval = setInterval(() => {
      if (video.paused || !video.duration) {
        clearInterval(rapidUpdateInterval);
        return;
      }
      
      const current = video.currentTime;
      const dur = video.duration;
      
      setCurrentTime(current);
      setProgress((current / dur) * 100);
      
      if (onTimeUpdate) {
        onTimeUpdate(current, dur);
      }
    }, 50); // Update every 50ms for first second

    // Clear rapid updates after 1 second
    const clearRapidUpdates = setTimeout(() => {
      clearInterval(rapidUpdateInterval);
    }, 1000);

    return () => {
      clearInterval(rapidUpdateInterval);
      clearTimeout(clearRapidUpdates);
    };
  }, [isPlaying, videoRef, onTimeUpdate]);


  // Initialize volume
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;
    
    video.volume = volume / 100;
    video.muted = isMuted;
  }, [videoRef, volume, isMuted]);

  return (
    <div className={`bg-black border-t border-black/20 h-full ${className}`}>
      <div className="px-2 py-1 h-full flex flex-col justify-center">
        {/* Timeline */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-xs font-normal min-w-[1.5rem]">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative">
            <div className="w-full h-1 bg-white/20 rounded-full">
              <div 
                className="h-full bg-[#D75C35] rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              onTouchStart={() => setIsScrubbing(true)}
              onTouchEnd={() => setIsScrubbing(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          
          <span className="text-white text-xs font-normal min-w-[1.5rem]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlayback}
              className="w-5 h-5 bg-white rounded flex items-center justify-center hover:bg-white/90 transition-colors"
            >
              {isPlaying ? (
                <PauseIcon className="w-3 h-3 text-black" />
              ) : (
                <PlayIcon className="w-3 h-3 text-black ml-px" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="w-3 h-3 flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 18 19" fill="none">
                <path 
                  d="M9 2.5v14l-3-3H2V6.5h4l3-4z M12 6.5c1.5 0 3 1.5 3 4s-1.5 4-3 4" 
                  stroke={isMuted ? "#666" : "white"} 
                  strokeWidth="1.5" 
                  fill="none"
                />
                {isMuted && (
                  <line x1="6" y1="6" x2="15" y2="15" stroke="#666" strokeWidth="2"/>
                )}
              </svg>
            </button>
            
            <div className="w-12 h-1 relative">
              <div className="w-full h-full bg-black rounded-full"></div>
              <div 
                className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-200"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}