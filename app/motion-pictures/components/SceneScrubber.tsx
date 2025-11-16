"use client";

import { useState, useRef } from "react";

interface SceneScrubberProps {
  videoDuration: number;
  onSceneAdd: (startTime: number, endTime: number) => void;
}

export default function SceneScrubber({ videoDuration, onSceneAdd }: SceneScrubberProps) {
  const [inTime, setInTime] = useState(0);
  const [outTime, setOutTime] = useState(Math.min(10, videoDuration));
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'in' | 'out' | null>(null);
  const inTimeRef = useRef(inTime);
  const outTimeRef = useRef(outTime);

  // Keep refs in sync
  inTimeRef.current = inTime;
  outTimeRef.current = outTime;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (handle: 'in' | 'out') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handle;
    console.log('Mouse down on', handle, 'handle');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!scrubberRef.current || !isDraggingRef.current) return;

      const rect = scrubberRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const time = (x / rect.width) * videoDuration;

      console.log('Dragging', isDraggingRef.current, 'to time:', time);

      if (isDraggingRef.current === 'in') {
        const newInTime = Math.max(0, Math.min(time, outTimeRef.current - 1));
        setInTime(newInTime);
      } else if (isDraggingRef.current === 'out') {
        const newOutTime = Math.min(videoDuration, Math.max(time, inTimeRef.current + 1));
        setOutTime(newOutTime);
      }
    };

    const handleMouseUp = () => {
      console.log('Mouse up - stopped dragging');
      isDraggingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleAddScene = () => {
    console.log('Adding scene:', inTime, 'to', outTime);
    onSceneAdd(inTime, outTime);
    // Reset to next segment
    setInTime(outTime);
    setOutTime(Math.min(outTime + 10, videoDuration));
  };

  const inPosition = (inTime / videoDuration) * 100;
  const outPosition = (outTime / videoDuration) * 100;

  return (
    <div className="bg-[#0F0F0F] border-t border-gray-800 p-3">
      {/* Header with Duration and Button in same row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-semibold text-white">Scene Boundaries</h3>
          <div className="text-xs">
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="text-white font-mono">{formatTime(outTime - inTime)}</span>
          </div>
        </div>
        <button
          onClick={handleAddScene}
          className="bg-[#D75C35] hover:bg-[#C14D2A] text-white px-4 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Scene
        </button>
      </div>

      {/* Compact Timeline with padding for labels */}
      <div className="relative pt-2 pb-6">
        <div
          ref={scrubberRef}
          className="relative h-10 bg-[#1A1A1A] rounded select-none"
        >
          {/* Selected Region */}
          <div
            className="absolute top-0 bottom-0 bg-[#D75C35]/20 border-l-2 border-r-2 border-[#D75C35] pointer-events-none"
            style={{
              left: `${inPosition}%`,
              right: `${100 - outPosition}%`
            }}
          />

          {/* In Handle (Green) - Make entire vertical bar draggable */}
          <div
            className="absolute top-0 bottom-0 w-6 cursor-ew-resize z-20 flex items-center justify-center"
            style={{ left: `calc(${inPosition}% - 12px)` }}
            onMouseDown={handleMouseDown('in')}
          >
            <div className="w-1 h-full bg-green-500 hover:bg-green-400 transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
              {formatTime(inTime)}
            </div>
          </div>

          {/* Out Handle (Red) - Make entire vertical bar draggable */}
          <div
            className="absolute top-0 bottom-0 w-6 cursor-ew-resize z-20 flex items-center justify-center"
            style={{ left: `calc(${outPosition}% - 12px)` }}
            onMouseDown={handleMouseDown('out')}
          >
            <div className="w-1 h-full bg-red-500 hover:bg-red-400 transition-colors" />
            <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
              {formatTime(outTime)}
            </div>
          </div>

          {/* Timeline Markers */}
          <div className="absolute inset-0 flex items-center px-1 pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => {
              const time = (videoDuration / 4) * i;
              return (
                <div
                  key={i}
                  className="flex-1 text-center text-[9px] text-gray-600 font-mono"
                >
                  {formatTime(time)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
