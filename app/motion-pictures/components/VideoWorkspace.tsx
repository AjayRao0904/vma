"use client";

import { useState, useRef, useEffect } from "react";
import { useStudio } from "../../contexts/StudioContext";
import SceneScrubber from "./SceneScrubber";
import PreviewModal from "./PreviewModal";
import GeneratingPreviewModal from "./GeneratingPreviewModal";

interface VideoWorkspaceProps {
  videoUrl: string;
  videoDuration: number;
  projectMode: 'entire' | 'scenes' | null;
  projectId: string;
  videoId?: string;
  onSceneCreated?: (sceneId: string) => void;
}

export default function VideoWorkspace({ videoUrl, videoDuration, projectMode, projectId, videoId, onSceneCreated }: VideoWorkspaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { selectedScene, scenes, addScene } = useStudio();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showScrubber, setShowScrubber] = useState(false);
  const [actualDuration, setActualDuration] = useState(videoDuration);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [soundEffects, setSoundEffects] = useState<any[]>([]);
  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Auto-show scrubber when in scenes mode and no scenes exist
  useEffect(() => {
    if (projectMode === 'scenes' && scenes.length === 0) {
      setShowScrubber(true);
    }
  }, [projectMode, scenes.length]);

  // Get duration from video element if not provided
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.duration && video.duration !== Infinity) {
        console.log('Video duration from element:', video.duration);
        setActualDuration(video.duration);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    // Also check immediately in case already loaded
    if (video.duration && video.duration !== Infinity) {
      setActualDuration(video.duration);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl]);

  // Update current time and enforce scene boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      setCurrentTime(currentTime);

      // If a scene is selected, stop playback when reaching the end
      if (selectedScene && currentTime >= selectedScene.endTime) {
        video.pause();
        video.currentTime = selectedScene.startTime; // Reset to start of scene
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [selectedScene?.id, selectedScene?.startTime, selectedScene?.endTime]);

  // Zoom timeline to selected scene
  useEffect(() => {
    if (selectedScene && videoRef.current) {
      videoRef.current.currentTime = selectedScene.startTime;
    }
  }, [selectedScene]);

  // Load audio tracks for selected scene
  useEffect(() => {
    if (!selectedScene?.id) {
      setAudioTracks([]);
      setSoundEffects([]);
      return;
    }

    const loadAudioTracks = async () => {
      try {
        const response = await fetch(`/api/audio-variations?scene_id=${selectedScene.id}`);
        if (response.ok) {
          const tracks = await response.json();

          // Get presigned URLs for all tracks
          const s3Keys = tracks.map((t: any) => t.file_path).filter(Boolean);
          if (s3Keys.length > 0) {
            const urlResponse = await fetch('/api/presigned-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ s3Keys })
            });

            if (urlResponse.ok) {
              const { urls } = await urlResponse.json();
              const tracksWithUrls = tracks.map((track: any) => ({
                ...track,
                audioUrl: track.file_path ? urls[track.file_path] : null
              }));
              setAudioTracks(tracksWithUrls);
            } else {
              setAudioTracks(tracks);
            }
          } else {
            setAudioTracks(tracks);
          }
        }
      } catch (error) {
        console.error('Error loading audio tracks:', error);
      }
    };

    const loadSoundEffects = async () => {
      try {
        const response = await fetch(`/api/sound-effects?scene_id=${selectedScene.id}`);
        if (response.ok) {
          const data = await response.json();
          const effects = data.effects || [];

          // Get presigned URLs for generated sound effects
          const s3Keys = effects.map((e: any) => e.file_path).filter(Boolean);
          if (s3Keys.length > 0) {
            const urlResponse = await fetch('/api/presigned-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ s3Keys })
            });

            if (urlResponse.ok) {
              const { urls } = await urlResponse.json();
              const effectsWithUrls = effects.map((effect: any) => ({
                ...effect,
                audioUrl: effect.file_path ? urls[effect.file_path] : null
              }));
              setSoundEffects(effectsWithUrls);
            } else {
              setSoundEffects(effects);
            }
          } else {
            setSoundEffects(effects);
          }
        }
      } catch (error) {
        console.error('Error loading sound effects:', error);
      }
    };

    loadAudioTracks();
    loadSoundEffects();

    // Listen for audio generation events to reload tracks
    const handleAudioGenerated = (event: any) => {
      if (event.detail.sceneId === selectedScene.id) {
        console.log('Audio generated event received, reloading tracks...');
        setTimeout(loadAudioTracks, 2000);
      }
    };

    const handleSoundEffectsGenerated = (event: any) => {
      if (event.detail.sceneId === selectedScene.id) {
        console.log('Sound effects generated event received, reloading effects...');
        setTimeout(loadSoundEffects, 2000);
      }
    };

    window.addEventListener('audioGenerated', handleAudioGenerated);
    window.addEventListener('soundEffectsGenerated', handleSoundEffectsGenerated);
    return () => {
      window.removeEventListener('audioGenerated', handleAudioGenerated);
      window.removeEventListener('soundEffectsGenerated', handleSoundEffectsGenerated);
    };
  }, [selectedScene?.id]);

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

  const toggleAudioPlayback = (trackId: string) => {
    const audio = audioRefs.current[trackId];
    if (!audio) return;

    if (playingTrackId === trackId) {
      audio.pause();
      setPlayingTrackId(null);
    } else {
      // Pause any currently playing track
      if (playingTrackId && audioRefs.current[playingTrackId]) {
        audioRefs.current[playingTrackId].pause();
      }
      audio.currentTime = 0;
      audio.play();
      setPlayingTrackId(trackId);
    }
  };

  const handleTrackPreviewToggle = async (trackId: string, currentValue: boolean) => {
    try {
      // If selecting this track, first deselect all other music tracks
      if (!currentValue) {
        // Deselect all other tracks first
        const otherTracks = audioTracks.filter(t => t.id !== trackId && t.selected_for_preview);
        for (const track of otherTracks) {
          await fetch(`/api/audio-variations/${track.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_for_preview: false })
          });
        }
      }

      // Now toggle the current track
      await fetch(`/api/audio-variations/${trackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_for_preview: !currentValue })
      });

      // Update UI - only one music track can be selected for preview
      setAudioTracks(prev => prev.map(t => ({
        ...t,
        selected_for_preview: t.id === trackId ? !currentValue : false
      })));
    } catch (error) {
      console.error('Error toggling preview selection:', error);
    }
  };

  const handleDownloadTrack = (track: any) => {
    try {
      if (!track.audioUrl) {
        alert('Audio file not available');
        return;
      }

      // Use the presigned URL directly
      const a = document.createElement('a');
      a.href = track.audioUrl;
      a.download = `${track.title || 'music-track'}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading track:', error);
      alert('Failed to download track');
    }
  };

  const handleEffectPreviewToggle = async (effectId: string, currentValue: boolean) => {
    try {
      await fetch(`/api/sound-effects/${effectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_for_preview: !currentValue })
      });

      setSoundEffects(prev => prev.map(e =>
        e.id === effectId ? { ...e, selected_for_preview: !currentValue } : e
      ));
    } catch (error) {
      console.error('Error toggling effect preview selection:', error);
    }
  };

  const handleDownloadEffect = (effect: any) => {
    try {
      if (!effect.audioUrl) {
        alert('Audio file not available');
        return;
      }

      // Use the presigned URL directly
      const a = document.createElement('a');
      a.href = effect.audioUrl;
      a.download = `${effect.title || 'sound-effect'}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading effect:', error);
      alert('Failed to download effect');
    }
  };


  const handleGeneratePreview = async () => {
    if (!selectedScene) return;

    const selectedMusicTrack = audioTracks.find(t => t.selected_for_preview);
    const selectedEffects = soundEffects.filter(e => e.selected_for_preview);

    if (!selectedMusicTrack && selectedEffects.length === 0) {
      alert('Please select at least one music track and/or sound effects for preview');
      return;
    }

    setIsGeneratingPreview(true);

    try {
      const response = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedScene.id,
          musicTrackId: selectedMusicTrack?.id || null,
          soundEffectIds: selectedEffects.map(e => e.id)
        })
      });

      if (response.ok) {
        const { previewUrl } = await response.json();
        setPreviewTrackUrl(previewUrl);
        setIsGeneratingPreview(false);
        setShowPreviewModal(true);
        console.log('Preview track generated:', previewUrl);
      } else {
        const error = await response.json();
        setIsGeneratingPreview(false);
        alert(`Failed to generate preview: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setIsGeneratingPreview(false);
      alert('Failed to generate preview track');
    }
  };


  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] overflow-hidden">
      {/* Video Player - Made smaller */}
      <div className="flex items-center justify-center bg-black p-4" style={{ height: '55vh' }}>
        {videoUrl ? (
          <div className="relative w-full h-full max-w-4xl">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain rounded-lg"
              controls={false}
            />

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 bg-[#D75C35] hover:bg-[#C14D2A] rounded-full flex items-center justify-center transition-colors"
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
                <div className="text-sm text-white font-mono">
                  {formatTime(currentTime)} / {formatTime(actualDuration)}
                </div>

                {/* Scene Info */}
                {selectedScene && (
                  <div className="flex-1 text-sm text-gray-400">
                    <span className="text-[#D75C35] font-medium">{selectedScene.name}</span>
                    <span className="mx-2">•</span>
                    <span>{formatTime(selectedScene.startTime)} - {formatTime(selectedScene.endTime)}</span>
                  </div>
                )}

                {/* Add Scene Button (when in scenes mode) */}
                {projectMode === 'scenes' && (
                  <button
                    onClick={() => setShowScrubber(!showScrubber)}
                    className={`px-4 py-2 bg-[#1A1A1A] hover:bg-[#222] border border-gray-700 hover:border-[#D75C35] text-white rounded-lg text-sm transition-all ${
                      showScrubber ? 'border-[#D75C35] bg-[#222]' : ''
                    }`}
                  >
                    {showScrubber ? '− Hide Scrubber' : '+ Add Scene'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p>Upload a video to get started</p>
          </div>
        )}
      </div>

      {/* Scene Scrubber (shown when in scenes mode) */}
      {projectMode === 'scenes' && showScrubber && actualDuration > 0 && (
        <SceneScrubber
          videoDuration={actualDuration}
          onSceneAdd={async (startTime, endTime) => {
            const sceneNumber = scenes.length + 1;
            const formatTime = (seconds: number) => {
              const mins = Math.floor(seconds / 60);
              const secs = Math.floor(seconds % 60);
              return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            const sceneName = `Scene ${sceneNumber} (${formatTime(startTime)} - ${formatTime(endTime)})`;

            // Save to database
            if (videoId) {
              try {
                const response = await fetch('/api/scenes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    project_id: projectId,
                    video_id: videoId,
                    name: sceneName,
                    start_time: startTime,
                    end_time: endTime
                  })
                });

                if (response.ok) {
                  const savedScene = await response.json();
                  // Add to context with database ID
                  addScene({
                    id: savedScene.id,
                    name: sceneName,
                    startTime,
                    endTime
                  });

                  // Trigger automatic analysis for the scene
                  if (onSceneCreated) {
                    onSceneCreated(savedScene.id);
                  }
                } else {
                  console.error('Failed to save scene to database');
                  // Still add to context for UI feedback
                  addScene({
                    name: sceneName,
                    startTime,
                    endTime
                  });
                }
              } catch (error) {
                console.error('Error saving scene:', error);
                // Still add to context for UI feedback
                addScene({
                  name: sceneName,
                  startTime,
                  endTime
                });
              }
            } else {
              // No video ID, just add to context
              addScene({
                name: sceneName,
                startTime,
                endTime
              });
            }
          }}
        />
      )}

      {/* Audio Tracks and Sound Effects Section - Side by Side */}
      {selectedScene && (
        <div className="border-t border-gray-800 bg-[#0F0F0F] p-4 flex flex-col h-[35vh]">

          {/* Preview Buttons - Above columns on the right */}
          <div className="flex items-center justify-end gap-2 mb-3">
            {previewTrackUrl && (
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Preview
              </button>
            )}
            <button
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview || (audioTracks.filter(t => t.selected_for_preview).length === 0 && soundEffects.filter(e => e.selected_for_preview).length === 0)}
              className="px-2 py-1 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
            >
              {previewTrackUrl ? 'Regenerate Preview' : 'Generate Preview'}
            </button>
          </div>

          {/* Columns Container */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Music Tracks Column */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  Music
                  <span className="text-xs text-gray-500 font-normal">({audioTracks.length})</span>
                </h3>
              </div>

            <div className="flex-1 overflow-y-auto">
              {audioTracks.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p>No tracks yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {audioTracks.map((track) => (
                    <div
                      key={track.id}
                      className="bg-[#1A1A1A] border border-gray-800 rounded p-2 hover:border-[#D75C35] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {/* Play Button */}
                        <button
                          onClick={() => toggleAudioPlayback(track.id)}
                          disabled={!track.audioUrl}
                          className="w-6 h-6 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          {playingTrackId === track.id ? (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-medium text-white truncate">{track.title}</h4>
                            {track.bpm && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#D75C35]/20 text-[#D75C35] rounded flex-shrink-0">
                                {track.bpm}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{track.prompt}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Preview Checkbox */}
                          <input
                            type="checkbox"
                            checked={track.selected_for_preview || false}
                            onChange={() => handleTrackPreviewToggle(track.id, track.selected_for_preview)}
                            className="w-3.5 h-3.5 rounded border-gray-600 text-[#D75C35] focus:ring-[#D75C35] focus:ring-offset-0 bg-[#0F0F0F]"
                            title="Select for preview"
                          />

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownloadTrack(track)}
                            disabled={!track.audioUrl}
                            className="text-gray-500 hover:text-green-500 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                            title="Download"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={async () => {
                              if (confirm('Delete this music track?')) {
                                try {
                                  const response = await fetch(`/api/audio-variations/${track.id}`, {
                                    method: 'DELETE'
                                  });
                                  if (response.ok) {
                                    setAudioTracks(prev => prev.filter(t => t.id !== track.id));
                                  } else {
                                    alert('Failed to delete track');
                                  }
                                } catch (error) {
                                  console.error('Error deleting track:', error);
                                  alert('Failed to delete track');
                                }
                              }
                            }}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Hidden Audio Element */}
                        {track.audioUrl && (
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current[track.id] = el;
                            }}
                            src={track.audioUrl}
                            onEnded={() => setPlayingTrackId(null)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Sound Effects Column */}
            <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-700 pl-4">
              <div className="flex items-center mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  SFX
                  <span className="text-xs text-gray-500 font-normal">({soundEffects.length})</span>
                </h3>
              </div>

            <div className="flex-1 overflow-y-auto">
              {soundEffects.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <p>No effects yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {soundEffects.map((effect) => (
                    <div
                      key={effect.id}
                      className="bg-[#1A1A1A] border border-gray-800 rounded p-2 hover:border-[#D75C35] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {/* Play Button (if generated) */}
                        {effect.is_generated && effect.audioUrl ? (
                          <button
                            onClick={() => toggleAudioPlayback(effect.id)}
                            disabled={!effect.audioUrl}
                            className="w-6 h-6 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                          >
                            {playingTrackId === effect.id ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}

                        {/* Effect Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-medium text-white truncate">{effect.title}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex-shrink-0">
                              @{parseFloat(effect.timestamp_start).toFixed(1)}s
                            </span>
                            {!effect.is_generated && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded flex-shrink-0">
                                Pending
                              </span>
                            )}
                          </div>
                          {effect.description && (
                            <p className="text-[10px] text-gray-500 truncate">{effect.description}</p>
                          )}
                        </div>

                        {/* Action Buttons (only for generated effects) */}
                        {effect.is_generated && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Preview Checkbox */}
                            <input
                              type="checkbox"
                              checked={effect.selected_for_preview || false}
                              onChange={() => handleEffectPreviewToggle(effect.id, effect.selected_for_preview)}
                              className="w-3.5 h-3.5 rounded border-gray-600 text-[#D75C35] focus:ring-[#D75C35] focus:ring-offset-0 bg-[#0F0F0F]"
                              title="Select for preview"
                            />

                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadEffect(effect)}
                              disabled={!effect.audioUrl}
                              className="text-gray-500 hover:text-green-500 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
                              title="Download"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={async () => {
                                if (confirm('Delete this sound effect?')) {
                                  try {
                                    const response = await fetch(`/api/sound-effects/${effect.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok) {
                                      setSoundEffects(prev => prev.filter(e => e.id !== effect.id));
                                    } else {
                                      alert('Failed to delete sound effect');
                                    }
                                  } catch (error) {
                                    console.error('Error deleting sound effect:', error);
                                    alert('Failed to delete sound effect');
                                  }
                                }
                              }}
                              className="text-gray-500 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Hidden Audio Element */}
                        {effect.audioUrl && (
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current[effect.id] = el;
                            }}
                            src={effect.audioUrl}
                            onEnded={() => setPlayingTrackId(null)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>

        </div>
      )}

      {/* Generating Preview Modal */}
      {isGeneratingPreview && <GeneratingPreviewModal />}

      {/* Preview Modal */}
      {showPreviewModal && previewTrackUrl && selectedScene && (
        <PreviewModal
          videoUrl={videoUrl}
          previewAudioUrl={previewTrackUrl}
          sceneName={selectedScene.name}
          sceneStartTime={selectedScene.startTime}
          sceneEndTime={selectedScene.endTime}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}
