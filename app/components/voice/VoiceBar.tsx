import React, { useEffect, useState } from 'react';

interface VoiceBarProps {
  audioLevel: number; // 0-1
  isRecording: boolean;
  isFinished?: boolean;
  onTimeUp?: () => void;
  className?: string;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({ 
  audioLevel, 
  isRecording,
  isFinished = false,
  onTimeUp,
  className = ''
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const maxDuration = 90; // 90 seconds

  // Calculate dynamic progress with easing (fast start, slow end)
  const calculateProgress = (time: number): number => {
    if (time >= maxDuration) return 100;
    
    const normalizedTime = time / maxDuration;
    // Ease-out curve: fast at start, slower towards end
    const easedProgress = 1 - Math.pow(1 - normalizedTime, 2);
    return easedProgress * 100;
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          const newProgress = calculateProgress(newTime);
          setProgress(newProgress);
          
          // Call onTimeUp when we reach max duration
          if (newTime >= maxDuration && onTimeUp) {
            onTimeUp();
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      // Reset when not recording
      setRecordingTime(0);
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, onTimeUp, maxDuration]);

  // Audio level indicators with real-time response
  const getLevelIcon = (levelIndex: number) => {
    // More sensitive audio level detection
    const threshold = levelIndex * 0.25; // 0, 0.25, 0.5, 0.75
    const isActive = audioLevel > threshold;
    
    switch (levelIndex) {
      case 0: // Level 1 - Microphone (always shows if any audio)
        return (
          <svg 
            className={`w-4 h-4 transition-colors duration-150 ${
              audioLevel > 0.1 ? 'text-orange' : 'text-white/50'
            }`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm5.3 6c.4 0 .7.3.7.7 0 3-2.1 5.5-5 6.1V17h2c.6 0 1 .4 1 1s-.4 1-1 1h-6c-.6 0-1-.4-1-1s.4-1 1-1h2v-2.2c-2.9-.6-5-3.1-5-6.1 0-.4.3-.7.7-.7s.7.3.7.7c0 2.8 2.2 5 5 5s5-2.2 5-5c0-.4.3-.7.7-.7z"/>
          </svg>
        );
      case 1: // Level 2 - Volume medium
        return (
          <svg 
            className={`w-4 h-4 transition-colors duration-150 ${
              isActive ? 'text-orange' : 'text-white/50'
            }`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
        );
      case 2: // Level 3 - Volume high
        return (
          <svg 
            className={`w-4 h-4 transition-colors duration-150 ${
              isActive ? 'text-orange' : 'text-white/50'
            }`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isRecording && !isFinished) return null;

  return (
    <div className={`w-full bg-black/80 rounded-lg p-4 ${className}`}>
      {/* Progress Bar with Dynamic Animation */}
      <div className="relative w-full h-8 bg-black rounded-lg mb-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-black rounded-lg"></div>
        
        {/* Animated Progress Fill */}
        <div 
          className={`absolute left-0 top-0 h-full rounded-lg transition-all duration-1000 ease-out ${
            isFinished ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-orange to-orange'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {/* Shimmer effect when speaking */}
          {audioLevel > 0.2 && isRecording && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          )}
        </div>
        
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-sm font-medium drop-shadow">
            {isFinished ? `${formatTime(recordingTime)} - Ready to send` : `${formatTime(recordingTime)} / ${formatTime(maxDuration)}`}
          </span>
        </div>
      </div>

      {/* Audio Level Indicators */}
      <div className="flex items-center justify-center gap-8">
        {[0, 1, 2].map((levelIndex) => (
          <div key={levelIndex} className="flex flex-col items-center gap-2">
            {/* Level icon */}
            <div className="w-6 h-6 flex items-center justify-center">
              {getLevelIcon(levelIndex)}
            </div>
            
            {/* Vertical indicator bar */}
            <div className={`w-1 h-3 rounded-full transition-all duration-200 ${
              (isRecording && audioLevel > (levelIndex * 0.25)) ? 'bg-orange' : 
              isFinished ? 'bg-green-400' : 'bg-black/60'
            }`}></div>
          </div>
        ))}
      </div>

      {/* Real-time Audio Waveform */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 24 }, (_, i) => {
            const barThreshold = i / 24;
            const isActive = isRecording && audioLevel > barThreshold;
            // Dynamic height based on position and audio level
            const baseHeight = 8 + (i % 4) * 2;
            const audioHeight = isActive ? Math.min(32, baseHeight + (audioLevel * 20)) : baseHeight;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isActive ? 'bg-orange' : 
                  isFinished ? 'bg-green-400' : 'bg-black/60'
                }`}
                style={{ 
                  height: `${audioHeight}px`,
                  transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};