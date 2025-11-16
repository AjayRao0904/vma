"use client";

import { useRef, useEffect, useState } from "react";
import { Scene } from "../../contexts/StudioContext";

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  selectedScene: Scene | null;
  allScenes: Scene[];
}

export default function Timeline({ videoRef, currentTime, duration, selectedScene, allScenes }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleTimelineClick(e);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleDragEnd);
      return () => window.removeEventListener('mouseup', handleDragEnd);
    }
  }, [isDragging]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimelinePosition = (time: number) => {
    return duration > 0 ? (time / duration) * 100 : 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">Timeline</span>
        {selectedScene && (
          <span className="text-xs text-gray-600">
            Viewing: {selectedScene.name}
          </span>
        )}
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Video Track */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Video</div>
          <div
            ref={timelineRef}
            className="relative h-12 bg-[#1A1A1A] rounded-lg cursor-pointer overflow-hidden"
            onClick={handleTimelineClick}
            onMouseDown={handleDragStart}
            onMouseMove={handleDrag}
          >
            {/* Scene Markers */}
            {allScenes.map((scene) => (
              <div
                key={scene.id}
                className={`absolute top-0 bottom-0 border-2 rounded ${
                  selectedScene?.id === scene.id
                    ? 'bg-[#D75C35]/20 border-[#D75C35]'
                    : 'bg-blue-500/10 border-blue-500/50'
                }`}
                style={{
                  left: `${getTimelinePosition(scene.startTime)}%`,
                  width: `${getTimelinePosition(scene.endTime - scene.startTime)}%`
                }}
                title={scene.name}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#D75C35] pointer-events-none"
              style={{ left: `${getTimelinePosition(currentTime)}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#D75C35] rounded-full" />
            </div>

            {/* Time Markers */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
              <span className="text-[10px] text-gray-600">{formatTime(0)}</span>
              <span className="text-[10px] text-gray-600">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Music Track */}
        {selectedScene && selectedScene.musicTracks.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Music</div>
            {selectedScene.musicTracks.filter(t => t.isActive).map((track) => (
              <div
                key={track.id}
                className="h-10 bg-[#1A1A1A] rounded-lg flex items-center px-3 border-l-4 border-[#D75C35]"
              >
                <div className="flex items-center gap-2 flex-1">
                  <svg className="w-4 h-4 text-[#D75C35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="text-sm text-white">{track.title}</span>
                  <span className="text-xs text-gray-600">V{track.version}</span>
                </div>
                <span className="text-xs text-gray-600">{track.duration}s</span>
              </div>
            ))}
          </div>
        )}

        {/* SFX Track */}
        {selectedScene && selectedScene.sfxLayers.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sound Effects</div>
            <div className="relative h-10 bg-[#1A1A1A] rounded-lg">
              {selectedScene.sfxLayers.map((sfx) => {
                const relativeTime = sfx.timestamp - selectedScene.startTime;
                const sceneLength = selectedScene.endTime - selectedScene.startTime;
                const position = (relativeTime / sceneLength) * 100;

                return (
                  <div
                    key={sfx.id}
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-full"
                    style={{ left: `${position}%` }}
                    title={sfx.name}
                  >
                    <div className="absolute top-0 left-2 text-[10px] text-green-500 whitespace-nowrap">
                      {sfx.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!selectedScene || (selectedScene.musicTracks.length === 0 && selectedScene.sfxLayers.length === 0)) && (
          <div className="text-center py-8 text-gray-600 text-sm">
            {selectedScene ? 'No music or SFX added yet' : 'Select a scene to view its timeline'}
          </div>
        )}
      </div>
    </div>
  );
}
