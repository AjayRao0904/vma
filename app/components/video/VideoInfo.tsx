'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useScenes } from '../../contexts/SceneContext';

interface VideoInfoProps {
  className?: string;
  videoFile?: File | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  currentTime?: number;
  duration?: number;
}

interface ThumbnailData {
  thumbnails: string[];
  duration: number;
  sessionId: string;
}

interface SceneSelection {
  id: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  endPercent: number;
}

export default function VideoInfo({ 
  className = '', 
  videoFile, 
  videoRef,
  currentTime = 0,
  duration = 0 
}: VideoInfoProps) {
  const { addExportedScenes } = useScenes();
  const [thumbnailData, setThumbnailData] = useState<ThumbnailData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scrubberProgress, setScrubberProgress] = useState(0);
  const [hoveredProgress, setHoveredProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Trim mode states
  const [isTrimMode, setIsTrimMode] = useState(false);
  const [currentSceneStart, setCurrentSceneStart] = useState<number | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<SceneSelection[]>([]);
  const [isSelectingScene, setIsSelectingScene] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0); // Where the next scene should start from
  
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Generate thumbnails when video file changes
  useEffect(() => {
    if (videoFile) {
      generateThumbnails();
    } else {
      setThumbnailData(null);
    }
  }, [videoFile]);

  // Update scrubber progress based on current time
  useEffect(() => {
    if (duration > 0) {
      setScrubberProgress((currentTime / duration) * 100);
    }
  }, [currentTime, duration]);

  const generateThumbnails = async () => {
    if (!videoFile) return;
    
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      
      console.log('Sending video for thumbnail generation...');
      
      const response = await fetch('/api/thumbnails', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Thumbnail data received:', data);
        setThumbnailData(data);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate thumbnails:', errorData);
        alert(`Failed to generate thumbnails: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      alert(`Error generating thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScrubberClick = (e: React.MouseEvent) => {
    if (!scrubberRef.current || !videoRef?.current || !thumbnailData) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    // In trim mode, handle clicks differently
    if (isTrimMode && isSelectingScene && currentSceneStart !== null) {
      // Selecting scene end - restrict to forward movement only
      const restrictedPercentage = Math.max(currentSceneStart, percentage);
      const newTime = (restrictedPercentage / 100) * thumbnailData.duration;
      videoRef.current.currentTime = newTime;
      setScrubberProgress(restrictedPercentage);
    } else if (isTrimMode && !isSelectingScene) {
      // Starting new scene - can only click from trim progress forward
      const restrictedPercentage = Math.max(trimProgress, percentage);
      const newTime = (restrictedPercentage / 100) * thumbnailData.duration;
      videoRef.current.currentTime = newTime;
      setScrubberProgress(restrictedPercentage);
    } else {
      // Normal mode
      const newTime = (percentage / 100) * thumbnailData.duration;
      videoRef.current.currentTime = newTime;
      setScrubberProgress(percentage);
    }
  };

  const handleScrubberHover = (e: React.MouseEvent) => {
    if (!scrubberRef.current || !thumbnailData) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (hoverX / rect.width) * 100));
    
    // In trim mode, restrict movement based on current state
    if (isTrimMode && isSelectingScene && currentSceneStart !== null) {
      // Can only move forward from scene start
      const restrictedPercentage = Math.max(currentSceneStart, percentage);
      setHoveredProgress(restrictedPercentage);
      
      if (isDragging && videoRef?.current) {
        const newTime = (restrictedPercentage / 100) * thumbnailData.duration;
        videoRef.current.currentTime = newTime;
        setScrubberProgress(restrictedPercentage);
      }
    } else if (isTrimMode && !isSelectingScene) {
      // When not selecting, can only move from trim progress forward
      const restrictedPercentage = Math.max(trimProgress, percentage);
      setHoveredProgress(restrictedPercentage);
      
      if (isDragging && videoRef?.current) {
        const newTime = (restrictedPercentage / 100) * thumbnailData.duration;
        videoRef.current.currentTime = newTime;
        setScrubberProgress(restrictedPercentage);
      }
    } else {
      // Normal mode - no restrictions
      setHoveredProgress(percentage);
      
      if (isDragging && videoRef?.current) {
        const newTime = (percentage / 100) * thumbnailData.duration;
        videoRef.current.currentTime = newTime;
        setScrubberProgress(percentage);
      }
    }
  };

  const handleScrubberLeave = () => {
    setHoveredProgress(null);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrubberRef.current || !videoRef?.current || !thumbnailData) return;
    
    setIsDragging(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newTime = (percentage / 100) * thumbnailData.duration;
    
    videoRef.current.currentTime = newTime;
    setScrubberProgress(percentage);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse up listener for dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  // Trim mode functions
  const enterTrimMode = () => {
    setIsTrimMode(true);
    setSelectedScenes([]);
    setTrimProgress(0);
    setCurrentSceneStart(null);
    setIsSelectingScene(false);
    // Move video to the beginning
    if (videoRef?.current) {
      videoRef.current.currentTime = 0;
    }
    setScrubberProgress(0);
  };

  const exitTrimMode = () => {
    setIsTrimMode(false);
    setSelectedScenes([]);
    setTrimProgress(0);
    setCurrentSceneStart(null);
    setIsSelectingScene(false);
  };

  const startSceneSelection = () => {
    setIsSelectingScene(true);
    setCurrentSceneStart(trimProgress);
    // Move video to the trim progress position
    if (videoRef?.current && thumbnailData) {
      const startTime = (trimProgress / 100) * thumbnailData.duration;
      videoRef.current.currentTime = startTime;
    }
    setScrubberProgress(trimProgress);
  };

  const confirmScene = () => {
    if (currentSceneStart === null || !thumbnailData) return;
    
    const startTime = (currentSceneStart / 100) * thumbnailData.duration;
    const endTime = (scrubberProgress / 100) * thumbnailData.duration;
    
    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }

    const newScene: SceneSelection = {
      id: `scene_${Date.now()}`,
      startTime,
      endTime,
      startPercent: currentSceneStart,
      endPercent: scrubberProgress
    };

    setSelectedScenes(prev => [...prev, newScene]);
    setTrimProgress(scrubberProgress); // Next scene starts where this one ended
    setCurrentSceneStart(null);
    setIsSelectingScene(false);
  };

  const exportScenes = async () => {
    if (!videoFile || selectedScenes.length === 0) return;

    try {
      setIsGenerating(true);
      
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('scenes', JSON.stringify(selectedScenes));

      const response = await fetch('/api/trim-scenes', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add the exported scenes to the scene context
        if (result.sceneMetadata && result.sceneMetadata.length > 0) {
          addExportedScenes(result.sceneMetadata);
          console.log('Added exported scenes to context:', result.sceneMetadata);
        }
        
        alert(`Successfully exported ${selectedScenes.length} scenes! Check the content viewer below to see your scenes.`);
        exitTrimMode();
      } else {
        const errorData = await response.json();
        alert(`Failed to export scenes: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error exporting scenes:', error);
      alert(`Error exporting scenes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-black border-t border-black/20 h-full ${className}`}>
      <div className="px-3 py-1 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white text-xs font-medium">
            {isTrimMode ? `Trim Mode - ${selectedScenes.length} scenes selected` : 'Video Timeline'}
          </h3>
          <div className="flex items-center gap-2">
            {!isTrimMode ? (
              <>
                <button 
                  onClick={enterTrimMode}
                  className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-orange/20 border border-orange/30 hover:border-orange/50 transition-colors"
                >
                  Trim Scene
                </button>
                <button className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">
                  Continue
                </button>
              </>
            ) : (
              <>
                {!isSelectingScene ? (
                  <button 
                    onClick={startSceneSelection}
                    className="text-white hover:text-orange-light text-xs px-2 py-1 rounded bg-orange/20 border border-orange/50 hover:bg-orange/30 transition-colors"
                  >
                    Start Scene
                  </button>
                ) : (
                  <button 
                    onClick={confirmScene}
                    className="text-white hover:text-green-300 text-xs px-2 py-1 rounded bg-green-500/20 border border-green-500/50 hover:bg-green-500/30 transition-colors"
                  >
                    Choose Scene
                  </button>
                )}
                {selectedScenes.length > 0 && (
                  <button 
                    onClick={exportScenes}
                    disabled={isGenerating}
                    className="text-white hover:text-blue-300 text-xs px-2 py-1 rounded bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? 'Exporting...' : 'Export Scenes'}
                  </button>
                )}
                <button 
                  onClick={exitTrimMode}
                  className="text-white/60 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-colors"
                >
                  Exit
                </button>
              </>
            )}
          </div>
        </div>
        
        {videoFile ? (
          <div className="flex-1 flex flex-col">
            {/* Time Display */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/70 text-xs">
                {formatTime(currentTime)}
              </span>
              <span className="text-white/70 text-xs">
                {formatTime(duration)}
              </span>
            </div>
            
            {/* Thumbnail Scrubber */}
            <div className="flex-1 relative">
              {isGenerating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-white/50 text-xs">Generating timeline...</div>
                </div>
              ) : thumbnailData ? (
                <div className="h-full relative">
                  {/* Thumbnail Strip */}
                  <div 
                    ref={scrubberRef}
                    className={`h-full flex hover:shadow-lg transition-shadow duration-200 relative select-none ${
                      isDragging ? 'cursor-grabbing' : 'cursor-grab hover:cursor-grab'
                    }`}
                    onClick={handleScrubberClick}
                    onMouseMove={handleScrubberHover}
                    onMouseLeave={handleScrubberLeave}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                  >
                    {thumbnailData.thumbnails.map((thumbnail, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-full relative overflow-hidden border-r border-white/10 last:border-r-0 transition-all duration-150 ${
                          isDragging ? 'scale-105 brightness-110' : 'hover:scale-105'
                        }`}
                      >
                        <img
                          src={thumbnail}
                          alt={`Thumbnail ${index}`}
                          className="w-full h-full object-cover hover:brightness-110 transition-all duration-150"
                          draggable={false}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-200 ${
                          isDragging 
                            ? 'from-orange-900/30 to-transparent opacity-100' 
                            : 'from-black/20 to-transparent opacity-0 hover:opacity-100'
                        }`} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Selected Scenes Overlays */}
                  {selectedScenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className="absolute top-0 h-full bg-orange-500/30 border-l-2 border-r-2 border-orange-500 z-5 pointer-events-none"
                      style={{ 
                        left: `${scene.startPercent}%`, 
                        width: `${scene.endPercent - scene.startPercent}%` 
                      }}
                    >
                      <div className="absolute -top-2 left-1 text-xs text-orange-300 font-medium">
                        Scene {index + 1}
                      </div>
                    </div>
                  ))}
                  
                  {/* Current Scene Selection Overlay */}
                  {isTrimMode && isSelectingScene && currentSceneStart !== null && (
                    <div
                      className="absolute top-0 h-full bg-orange-400/40 border-l-2 border-orange-400 z-5 pointer-events-none"
                      style={{ 
                        left: `${currentSceneStart}%`, 
                        width: `${scrubberProgress - currentSceneStart}%` 
                      }}
                    >
                      <div className="absolute -top-2 left-1 text-xs text-orange-200 font-medium animate-pulse">
                        Selecting...
                      </div>
                    </div>
                  )}
                  
                  {/* Trim Progress Indicator (where next scene starts) */}
                  {isTrimMode && !isSelectingScene && trimProgress > 0 && (
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-blue-400 z-8 pointer-events-none"
                      style={{ left: `${trimProgress}%` }}
                    >
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div className="absolute -top-6 -left-8 text-xs text-blue-300 font-medium whitespace-nowrap">
                        Next Start
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Indicator */}
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-orange-500 z-10 pointer-events-none transition-all duration-100 ease-out"
                    style={{ left: `${scrubberProgress}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg"></div>
                    <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Hover Preview Indicator */}
                  {hoveredProgress !== null && !isDragging && (
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-orange-300/60 z-10 pointer-events-none transition-all duration-75 ease-out"
                      style={{ left: `${hoveredProgress}%` }}
                    >
                      <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-orange-300/80 rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <button
                    onClick={generateThumbnails}
                    className="text-white/70 hover:text-white text-xs px-3 py-1 rounded border border-white/20 hover:border-white/40 transition-colors"
                  >
                    Generate Timeline
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/50 text-xs text-center">
              Upload a video to see timeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
