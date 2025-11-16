'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { logger } from '../lib/logger';

// Scene represents a segment of the video
interface Scene {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  musicTracks: MusicTrack[];
  sfxLayers: SFXLayer[];
  chatHistory: ChatMessage[];
}

// Music track version for a scene
interface MusicTrack {
  id: string;
  version: number;
  title: string;
  audioPath: string;
  duration: number;
  prompt: string;
  isActive: boolean; // Which version is currently selected
}

// Sound effect layer
interface SFXLayer {
  id: string;
  name: string;
  audioPath: string;
  timestamp: number; // When it plays in the scene
  duration: number;
}

// Chat message in per-scene thread
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachedTrack?: MusicTrack; // If AI generated music
}

interface StudioContextType {
  // Scene management
  scenes: Scene[];
  selectedScene: Scene | null;
  setSelectedScene: (scene: Scene | null) => void;
  addScene: (scene: Omit<Scene, 'musicTracks' | 'sfxLayers' | 'chatHistory'> | Omit<Scene, 'id' | 'musicTracks' | 'sfxLayers' | 'chatHistory'>) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  removeScene: (sceneId: string) => void;
  loadScenes: (scenes: Scene[]) => void;
  clearScenes: () => void;

  // Music management
  addMusicTrack: (sceneId: string, track: Omit<MusicTrack, 'id'>) => void;
  setActiveTrack: (sceneId: string, trackId: string) => void;

  // SFX management
  addSFXLayer: (sceneId: string, sfx: Omit<SFXLayer, 'id'>) => void;
  removeSFXLayer: (sceneId: string, sfxId: string) => void;

  // Chat management
  addChatMessage: (sceneId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getChatHistory: (sceneId: string) => ChatMessage[];
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const addScene = useCallback((sceneData: Omit<Scene, 'musicTracks' | 'sfxLayers' | 'chatHistory'> | Omit<Scene, 'id' | 'musicTracks' | 'sfxLayers' | 'chatHistory'>) => {
    const newScene: Scene = {
      musicTracks: [],
      sfxLayers: [],
      chatHistory: [],
      ...sceneData,
      id: 'id' in sceneData ? sceneData.id : `scene-${Date.now()}`
    };
    setScenes(prev => [...prev, newScene]);
    logger.info('Scene added', { sceneId: newScene.id, name: newScene.name });
  }, []);

  const updateScene = useCallback((sceneId: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId ? { ...scene, ...updates } : scene
    ));
  }, []);

  const removeScene = useCallback(async (sceneId: string) => {
    try {
      logger.info('Starting scene deletion', { sceneId });

      // Call DELETE API to remove from database
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Failed to delete scene from database', {
          sceneId,
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to delete scene (${response.status})`);
      }

      logger.info('Scene deleted from database successfully', { sceneId });

      // Remove from UI state immediately after successful database deletion
      setScenes(prev => {
        const newScenes = prev.filter(scene => scene.id !== sceneId);
        logger.info('Updating scenes state', {
          before: prev.length,
          after: newScenes.length,
          removedSceneId: sceneId
        });
        return newScenes;
      });

      if (selectedScene?.id === sceneId) {
        setSelectedScene(null);
        logger.info('Cleared selected scene', { sceneId });
      }

      logger.info('Scene removal complete', { sceneId });
    } catch (error) {
      logger.error('Error removing scene', {
        sceneId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }, [selectedScene]);

  const addMusicTrack = useCallback((sceneId: string, track: Omit<MusicTrack, 'id'>) => {
    const newTrack: MusicTrack = {
      ...track,
      id: `track-${Date.now()}`
    };
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId
        ? { ...scene, musicTracks: [...scene.musicTracks, newTrack] }
        : scene
    ));
    logger.info('Music track added', { sceneId, trackId: newTrack.id, version: newTrack.version });
  }, []);

  const setActiveTrack = useCallback((sceneId: string, trackId: string) => {
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId
        ? {
            ...scene,
            musicTracks: scene.musicTracks.map(track => ({
              ...track,
              isActive: track.id === trackId
            }))
          }
        : scene
    ));
  }, []);

  const addSFXLayer = useCallback((sceneId: string, sfx: Omit<SFXLayer, 'id'>) => {
    const newSFX: SFXLayer = {
      ...sfx,
      id: `sfx-${Date.now()}`
    };
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId
        ? { ...scene, sfxLayers: [...scene.sfxLayers, newSFX] }
        : scene
    ));
    logger.info('SFX layer added', { sceneId, sfxId: newSFX.id });
  }, []);

  const removeSFXLayer = useCallback((sceneId: string, sfxId: string) => {
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId
        ? { ...scene, sfxLayers: scene.sfxLayers.filter(sfx => sfx.id !== sfxId) }
        : scene
    ));
  }, []);

  const addChatMessage = useCallback(async (sceneId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Update UI immediately
    setScenes(prev => prev.map(scene =>
      scene.id === sceneId
        ? { ...scene, chatHistory: [...scene.chatHistory, newMessage] }
        : scene
    ));

    // Save to database asynchronously
    try {
      await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_id: sceneId,
          role: message.role,
          content: message.content
        })
      });
      logger.info('Chat message saved to database', { sceneId, role: message.role });
    } catch (error) {
      logger.error('Failed to save chat message to database', { error, sceneId });
      // Continue even if DB save fails - message is in UI
    }
  }, []);

  const getChatHistory = useCallback((sceneId: string): ChatMessage[] => {
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.chatHistory || [];
  }, [scenes]);

  const loadScenes = useCallback((loadedScenes: Scene[]) => {
    setScenes(loadedScenes);
    logger.info('Scenes loaded from database', { count: loadedScenes.length });
  }, []);

  const clearScenes = useCallback(() => {
    setScenes([]);
    setSelectedScene(null);
    logger.info('Scenes cleared for project switch');
  }, []);

  return (
    <StudioContext.Provider value={{
      scenes,
      selectedScene,
      setSelectedScene,
      addScene,
      updateScene,
      removeScene,
      loadScenes,
      clearScenes,
      addMusicTrack,
      setActiveTrack,
      addSFXLayer,
      removeSFXLayer,
      addChatMessage,
      getChatHistory
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}

export type { Scene, MusicTrack, SFXLayer, ChatMessage };
