'use client';

import React, { useState, useCallback, useRef } from 'react';
import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useScenes, type ExportedScene, type AudioVariation } from '../../contexts/SceneContext';
import MediaPlayer from '../video/MediaPlayer';

export default function ContentViewer() {
  const { 
    exportedScenes, 
    updateSceneAudioVariations, 
    removeScene, 
    clearAllScenes 
  } = useScenes();
  
  const [activeSceneId, setActiveSceneId] = useState<string>(
    exportedScenes.length > 0 ? exportedScenes[0].id : ''
  );
  
  // Video refs for each scene
  const sceneVideoRefs = useRef<{ [key: string]: React.RefObject<HTMLVideoElement | null> }>({});
  
  // Ensure video refs exist for all scenes
  exportedScenes.forEach(scene => {
    if (!sceneVideoRefs.current[scene.id]) {
      sceneVideoRefs.current[scene.id] = React.createRef<HTMLVideoElement | null>();
    }
  });

  // Update active scene when scenes change
  React.useEffect(() => {
    if (exportedScenes.length > 0 && !exportedScenes.find(s => s.id === activeSceneId)) {
      setActiveSceneId(exportedScenes[0].id);
    }
  }, [exportedScenes, activeSceneId]);

  // Get current active scene
  const activeScene = exportedScenes.find(scene => scene.id === activeSceneId);
  const activeVideoRef = activeScene ? sceneVideoRefs.current[activeScene.id] : null;

  // Handle time updates from MediaPlayer
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    console.log('Scene video time update:', { currentTime, duration });
  }, []);

  // Format time in MM:SS format
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Toggle audio playback
  const togglePlayback = useCallback((variationId: string) => {
    if (!activeScene) return;
    
    const updatedVariations = activeScene.audioVariations.map(variation => 
      variation.id === variationId 
        ? { ...variation, isPlaying: !variation.isPlaying }
        : { ...variation, isPlaying: false }
    );
    
    updateSceneAudioVariations(activeScene.id, updatedVariations);
    
    const variation = activeScene.audioVariations.find(v => v.id === variationId);
    if (variation) {
      console.log(variation.isPlaying ? 'Pausing' : 'Playing', variation.title);
    }
  }, [activeScene, updateSceneAudioVariations]);

  // Handle download
  const handleDownload = useCallback((variationId: string, title: string) => {
    console.log('Downloading audio variation:', title, 'for scene:', activeScene?.name);
    alert(`Downloading ${title} for ${activeScene?.name}...`);
  }, [activeScene]);

  // Add new variation to current scene
  const addNewVariation = useCallback(() => {
    if (!activeScene) return;
    
    const newVariationNumber = activeScene.audioVariations.length + 1;
    const newVariation: AudioVariation = {
      id: `${activeScene.id}-${Date.now()}`,
      title: `Variation ${newVariationNumber}`,
      duration: '00:05',
      isPlaying: false
    };

    const updatedVariations = [...activeScene.audioVariations, newVariation];
    updateSceneAudioVariations(activeScene.id, updatedVariations);
    
    console.log('Added new audio variation:', newVariation.title, 'to', activeScene.name);
  }, [activeScene, updateSceneAudioVariations]);

  // Show message when no scenes are available
  if (exportedScenes.length === 0) {
    return (
      <div className="bg-[#1F1F1F] h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6v10H9V6z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-medium mb-2">No Scenes Exported</h3>
          <p className="text-white/60 text-sm text-center mb-4 max-w-md">
            Upload a video above and use the "Trim Scene" feature to export video scenes. 
            Each exported scene will appear as a tab here with its own audio variations.
          </p>
          <p className="text-white/40 text-xs">
            1. Upload a video → 2. Click "Trim Scene" → 3. Select scenes → 4. Click "Export Scenes"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1F1F1F] h-full flex flex-col">
      {/* Scene Tabs Header */}
      <div className="flex-shrink-0 border-b border-white/10">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          {exportedScenes.map((scene) => (
            <div key={scene.id} className="relative flex-shrink-0 flex items-center">
              <button
                onClick={() => setActiveSceneId(scene.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-medium transition-colors
                  ${activeSceneId === scene.id 
                    ? 'bg-[#2A2A2A] text-white border-t border-l border-r border-white/20' 
                    : 'bg-[#1A1A1A] text-white/60 hover:text-white hover:bg-[#252525]'
                  }
                  ${exportedScenes.length > 1 ? 'pr-8' : ''}
                `}
              >
                <span>{scene.name}</span>
                <span className="text-white/40 text-xs">
                  ({formatTime(scene.startTime)}-{formatTime(scene.endTime)})
                </span>
              </button>
              {exportedScenes.length > 1 && (
                <button
                  onClick={() => removeScene(scene.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 z-10"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          {/* Clear All Scenes Button */}
          <button
            onClick={clearAllScenes}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs transition-colors"
          >
            <XMarkIcon className="w-3 h-3" />
            Clear All
          </button>
        </div>
      </div>

      {/* Scene Content */}
      <div className="flex-1 p-3 overflow-y-auto">
        {/* Video Display Area for Active Scene */}
        {activeScene && (
          <div className="mb-4">
            <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={activeVideoRef}
                src={activeScene.videoPath}
                className="w-full h-full object-contain"
                controls={false}
                preload="metadata"
                playsInline
                onLoadedMetadata={() => {
                  console.log('Scene video loaded:', {
                    scene: activeScene.name,
                    duration: activeVideoRef?.current?.duration,
                    src: activeScene.videoPath
                  });
                }}
                onError={(e) => {
                  console.error('Scene video error:', {
                    scene: activeScene.name,
                    src: activeScene.videoPath,
                    error: e.currentTarget.error
                  });
                }}
              />
            </div>
            
            {/* MediaPlayer Controls */}
            <div className="h-[60px] mt-2">
              {activeVideoRef && (
                <MediaPlayer 
                  videoRef={activeVideoRef} 
                  className="rounded-lg"
                  onTimeUpdate={handleTimeUpdate}
                />
              )}
            </div>
          </div>
        )}

        {activeScene && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-sm font-medium">{activeScene.name}</h2>
              <span className="text-white/60 text-xs">
                {formatTime(activeScene.startTime)} - {formatTime(activeScene.endTime)}
              </span>
            </div>
            
            {/* Audio Variations */}
            <div className="space-y-2 mb-3">
              {activeScene.audioVariations.map((variation) => (
                <div key={variation.id} className="h-12 bg-black/20 rounded flex items-center px-2 border border-white/5">
                  <button 
                    onClick={() => togglePlayback(variation.id)}
                    className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center mr-3"
                  >
                    {variation.isPlaying ? (
                      <PauseIcon className="w-4 h-4 text-white" />
                    ) : (
                      <PlayIcon className="w-4 h-4 text-white ml-px" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="text-white text-xs">{variation.title}</div>
                    <div className="text-white/40 text-xs">{variation.duration}</div>
                  </div>
                  
                  <button 
                    onClick={() => handleDownload(variation.id, variation.title)}
                    className="w-6 h-6 bg-white/10 rounded flex items-center justify-center hover:bg-white/20"
                  >
                    <ArrowDownTrayIcon className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Add Variation Button */}
            <button
              onClick={addNewVariation}
              className="w-full h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center gap-2 hover:bg-white/10 text-white/60 hover:text-white text-xs"
            >
              <PlusIcon className="w-3 h-3" />
              Add Variation
            </button>
          </>
        )}
      </div>
    </div>
  );
}
