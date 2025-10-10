'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useScenes, type ExportedScene } from '../../contexts/SceneContext';
import MediaPlayer from '../video/MediaPlayer';
import { usePresignedUrls } from '../../hooks/usePresignedUrls';
import { useChat } from '../../contexts/ChatContext';
import ClientDateDisplay from '../ClientDateDisplay';
import { logger } from '../../lib/logger';

export default function ContentViewer() {
  const {
    exportedScenes,
    updateSceneAudioVariations,
    removeScene,
    clearAllScenes
  } = useScenes();

  const { sendMessage, addPromptMessage } = useChat();

  const [activeSceneId, setActiveSceneId] = useState<string>(
    exportedScenes.length > 0 ? exportedScenes[0].id : ''
  );

  const [analyzingScene, setAnalyzingScene] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false
  });

  // Video refs for each scene
  const sceneVideoRefs = useRef<{ [key: string]: React.RefObject<HTMLVideoElement | null> }>({});

  // Audio ref for playing generated music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
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

  // Stop audio when switching scenes
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [activeSceneId]);

  // Get current active scene
  const activeScene = exportedScenes.find(scene => scene.id === activeSceneId);
  const activeVideoRef = activeScene ? sceneVideoRefs.current[activeScene.id] : null;

  // Fetch pre-signed URLs for all scene videos
  const sceneVideoKeys = exportedScenes.map(scene => scene.videoPath).filter(Boolean);
  const { urls: sceneVideoUrls, loading: loadingSceneUrls } = usePresignedUrls(sceneVideoKeys);

  // Fetch pre-signed URLs for all audio variations
  const audioKeys = exportedScenes
    .flatMap(scene => scene.audioVariations)
    .map(variation => variation.audioPath)
    .filter(Boolean) as string[];

  const { urls: audioUrls } = usePresignedUrls(audioKeys);

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000); // Hide after 3 seconds
  }, []);

  // Analyze scene with AI
  const handleAnalyzeScene = useCallback(async (sceneId: string, sceneName: string) => {
    setAnalyzingScene(sceneId);
    showToast(`Analyzing ${sceneName}...`);

    try {
      const response = await fetch('/api/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Analysis API error', null, errorData);
        showToast(errorData.error || 'Failed to analyze scene');
        return;
      }

      const result = await response.json();

      // Add interactive prompt message to chat
      addPromptMessage({
        type: 'scene-analysis',
        sceneId: result.sceneId,
        sceneName: result.sceneName,
        musicPrompt: result.musicPrompt,
        detailedAnalysis: result.detailedAnalysis,
        rawAnalyses: result.analyses // Include raw LLaVA analyses
      });

      showToast(`Analysis complete for ${sceneName}!`);
    } catch (error) {
      logger.error('Error analyzing scene', error);
      showToast(error instanceof Error ? error.message : 'Failed to analyze scene');
    } finally {
      setAnalyzingScene(null);
    }
  }, [sendMessage, showToast]);

  // Handle time updates from MediaPlayer
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    logger.info('Scene video time update', { currentTime, duration });
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

    const variation = activeScene.audioVariations.find(v => v.id === variationId);
    if (!variation) return;

    // If clicking the same audio that's playing, pause it
    if (variation.isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const updatedVariations = activeScene.audioVariations.map(v =>
        v.id === variationId ? { ...v, isPlaying: false } : v
      );
      updateSceneAudioVariations(activeScene.id, updatedVariations);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Get pre-signed URL for this audio
    const audioUrl = variation.audioPath ? audioUrls[variation.audioPath] : null;

    if (audioUrl) {
      // Create new audio element and play
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;
      audioRef.current.loop = true; // Loop audio to match video length
      audioRef.current.volume = 0.7; // Set volume to 70%

      audioRef.current.play()
        .then(() => {
          logger.info('Playing audio', { title: variation.title });
          showToast(`Playing: ${variation.title}`);
        })
        .catch(err => {
          logger.error('Error playing audio', err);
          showToast('Failed to play audio');
        });

      // Update state to show this audio is playing
      const updatedVariations = activeScene.audioVariations.map(v =>
        v.id === variationId ? { ...v, isPlaying: true } : { ...v, isPlaying: false }
      );
      updateSceneAudioVariations(activeScene.id, updatedVariations);
    } else {
      showToast('Audio file not available');
      logger.error('No audio URL available for variation', null, { variationId });
    }
  }, [activeScene, updateSceneAudioVariations, audioUrls, showToast]);

  // Handle download
  const handleDownload = useCallback(async (variationId: string, title: string) => {
    if (!activeScene) return;

    const variation = activeScene.audioVariations.find(v => v.id === variationId);
    if (!variation || !variation.audioPath) {
      showToast('Audio file not available');
      return;
    }

    const audioUrl = audioUrls[variation.audioPath];
    if (!audioUrl) {
      showToast('Audio URL not available');
      return;
    }

    try {
      showToast('Downloading...');
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Download started!');
    } catch (error) {
      logger.error('Error downloading audio', error);
      showToast('Failed to download audio');
    }
  }, [activeScene, audioUrls, showToast]);

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
      {/* Project Status Header */}
      {exportedScenes.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 bg-[#2A2A2A] border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs">Project Scenes:</span>
              <span className="text-white text-xs font-medium">{exportedScenes.length} scenes</span>
              <span className="w-1 h-1 bg-green-400 rounded-full"></span>
              <span className="text-green-400 text-xs">Version Control Active</span>
            </div>
            <ClientDateDisplay 
              date={exportedScenes[0]?.createdAt || ''} 
              className="text-white/40 text-xs"
              format="date"
            />
          </div>
        </div>
      )}
      
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
                {/* Version indicator - green dot for database scenes */}
                {scene.sessionId && !scene.sessionId.includes(Date.now().toString().slice(-6)) && (
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1" title="Saved scene"></span>
                )}
              </button>
              {exportedScenes.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmDelete = window.confirm(
                      `Are you sure you want to delete "${scene.name}"?\n\nThis action cannot be undone.`
                    );
                    if (confirmDelete) {
                      const sceneName = scene.name;
                      removeScene(scene.id);
                      showToast(`"${sceneName}" deleted successfully`);
                    }
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 hover:bg-red-500/30 z-10 transition-all duration-200"
                  title={`Delete ${scene.name}`}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          {/* Clear All Scenes Button */}
          <button
            onClick={() => {
              const confirmClearAll = window.confirm(
                `Are you sure you want to delete all ${exportedScenes.length} scenes?\n\nThis action cannot be undone.`
              );
              if (confirmClearAll) {
                const sceneCount = exportedScenes.length;
                clearAllScenes();
                showToast(`All ${sceneCount} scenes deleted successfully`);
              }
            }}
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
            <div className="bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
              {sceneVideoUrls[activeScene.videoPath] ? (
                <>
                  <video
                    ref={activeVideoRef}
                    src={sceneVideoUrls[activeScene.videoPath]}
                    className="w-full h-full object-contain"
                    controls={false}
                    preload="auto"
                    playsInline
                    loop
                    onLoadedMetadata={() => {
                      logger.info('Scene video loaded', {
                        scene: activeScene.name,
                        duration: activeVideoRef?.current?.duration,
                        src: activeScene.videoPath,
                        presignedUrl: sceneVideoUrls[activeScene.videoPath]
                      });
                    }}
                    onError={(e) => {
                      logger.error('Scene video error', null, {
                        scene: activeScene.name,
                        src: activeScene.videoPath,
                        presignedUrl: sceneVideoUrls[activeScene.videoPath],
                        error: e.currentTarget.error
                      });
                    }}
                  />

                  {/* Audio Playing Indicator Overlay */}
                  {activeScene.audioVariations.some(v => v.isPlaying) && (
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-orange/50 flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 bg-orange rounded-full"></div>
                      <span className="text-orange text-sm font-medium">
                        Playing: {activeScene.audioVariations.find(v => v.isPlaying)?.title}
                      </span>
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-orange/60 rounded-sm animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-4 bg-orange/80 rounded-sm animate-pulse" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-3 bg-orange/60 rounded-sm animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  Loading video...
                </div>
              )}
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
              <div className="flex items-center gap-3">
                <h2 className="text-white text-sm font-medium">{activeScene.name}</h2>
                <span className="text-white/60 text-xs">
                  {formatTime(activeScene.startTime)} - {formatTime(activeScene.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAnalyzeScene(activeScene.id, activeScene.name)}
                  disabled={analyzingScene === activeScene.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange/20 border border-orange/40 hover:bg-orange/30 text-orange hover:text-white text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Analyze scene with AI to generate music prompt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  {analyzingScene === activeScene.id ? 'Analyzing...' : 'Analyze Scene'}
                </button>
                {exportedScenes.length > 1 && (
                  <button
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        `Are you sure you want to delete "${activeScene.name}"?\n\nThis action cannot be undone.`
                      );
                      if (confirmDelete) {
                        const sceneName = activeScene.name;
                        removeScene(activeScene.id);
                        showToast(`"${sceneName}" deleted successfully`);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs transition-colors"
                    title={`Delete ${activeScene.name}`}
                  >
                    <XMarkIcon className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {/* Audio Variations */}
            <div className="space-y-2 mb-3">
              {(() => {
                logger.info(`Rendering audio variations for ${activeScene.name}`, { variations: activeScene.audioVariations, totalVariations: activeScene.audioVariations.length });
                return null;
              })()}
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
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 transform transition-all duration-300 ease-in-out">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
