import React from 'react';
import { logger } from '../../lib/logger';

interface MicIconProps {
  isRecording?: boolean;
  isFinished?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onApprove?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MicIcon: React.FC<MicIconProps> = ({ 
  isRecording = false,
  isFinished = false,
  onStartRecording, 
  onStopRecording,
  onApprove,
  className = '',
  size = 'md'
}) => {

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Main Mic Button - Only for starting recording */}
      <button
        onClick={() => {
          logger.info('Mic button clicked', { isRecording, isFinished });
          if (!isRecording && !isFinished) {
            logger.info('Starting recording');
            onStartRecording?.();
          }
        }}
        className={`${sizeClasses[size]} rounded-lg border transition-all duration-200 hover:scale-105 ${
          isRecording || isFinished
            ? 'bg-black/50 border-white/40 cursor-not-allowed opacity-50' 
            : 'bg-orange border-orange hover:bg-orange/80'
        }`}
        title={isRecording ? 'Recording...' : isFinished ? 'Recording complete' : 'Start recording'}
        disabled={isRecording || isFinished}
      >
        {/* Always show microphone icon */}
        <svg 
          className={`${iconSizeClasses[size]} text-white m-auto`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm5.3 6c.4 0 .7.3.7.7 0 3-2.1 5.5-5 6.1V17h2c.6 0 1 .4 1 1s-.4 1-1 1h-6c-.6 0-1-.4-1-1s.4-1 1-1h2v-2.2c-2.9-.6-5-3.1-5-6.1 0-.4.3-.7.7-.7s.7.3.7.7c0 2.8 2.2 5 5 5s5-2.2 5-5c0-.4.3-.7.7-.7z"/>
        </svg>
      </button>

      {/* Approve/Tick Button (shown during recording OR when finished) */}
      {(isRecording || isFinished) && (
        <button
          onClick={() => {
            logger.info('Tick button clicked', { isRecording, isFinished });
            if (isRecording) {
              // Stop recording first, then approve
              logger.info('Stopping and approving');
              onStopRecording?.();
              setTimeout(() => {
                logger.info('Calling onApprove');
                onApprove?.();
              }, 200);
            } else {
              // Just approve if already finished
              logger.info('Just approving');
              onApprove?.();
            }
          }}
          className={`${sizeClasses[size]} rounded-lg border border-green-400 bg-green-500 transition-all duration-200 hover:scale-105 hover:bg-green-600`}
          title={isRecording ? "Stop and send recording" : "Send recording"}
        >
          <svg 
            className={`${iconSizeClasses[size]} text-white m-auto`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </button>
      )}
    </div>
  );
};