'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface ExportedScene {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  videoPath: string;
  sessionId: string;
  createdAt: string;
  audioVariations: AudioVariation[];
}

interface AudioVariation {
  id: string;
  title: string;
  duration: string;
  isPlaying: boolean;
  audioPath?: string;
}

interface SceneContextType {
  exportedScenes: ExportedScene[];
  addExportedScenes: (scenes: ExportedScene[]) => void;
  updateSceneAudioVariations: (sceneId: string, variations: AudioVariation[]) => void;
  reloadSceneAudio: (sceneId: string) => Promise<void>;
  removeScene: (sceneId: string) => void;
  clearAllScenes: () => void;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

const STORAGE_KEY = 'vma_exported_scenes';

export function SceneProvider({ children }: { children: ReactNode }) {
  const [exportedScenes, setExportedScenes] = useState<ExportedScene[]>([]);

  // Don't load scenes from localStorage on mount
  // Scenes should be loaded from database when project is loaded
  // localStorage is only used as a temporary cache

  // Save scenes to localStorage whenever scenes change (as cache only)
  useEffect(() => {
    try {
      if (exportedScenes.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exportedScenes));
      }
    } catch (error) {
      logger.error('Failed to save scenes to localStorage', error);
    }
  }, [exportedScenes]);

  const addExportedScenes = useCallback((newScenes: ExportedScene[]) => {
    setExportedScenes(prev => {
      // Remove any existing scenes with the same sessionId to avoid duplicates
      const filtered = prev.filter(scene =>
        !newScenes.some(newScene => newScene.sessionId === scene.sessionId)
      );
      return [...filtered, ...newScenes];
    });
  }, []);

  const updateSceneAudioVariations = useCallback((sceneId: string, variations: AudioVariation[]) => {
    setExportedScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? { ...scene, audioVariations: variations }
          : scene
      )
    );
  }, []);

  const removeScene = useCallback(async (sceneId: string) => {
    // Remove from local state immediately for better UX
    setExportedScenes(prev => prev.filter(scene => scene.id !== sceneId));
    
    // Try to delete from database (don't block UI if it fails)
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        logger.error('Failed to delete scene from database', null, { responseText: await response.text() });
      } else {
        logger.info('Scene deleted from database successfully');
      }
    } catch (error) {
      logger.error('Error deleting scene from database', error);
      // Scene is already removed from UI, so we don't need to revert
    }
  }, []);

  const clearAllScenes = useCallback(() => {
    setExportedScenes([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const reloadSceneAudio = useCallback(async (sceneId: string) => {
    try {
      logger.info('Reloading audio for scene', { sceneId });

      // Fetch audio variations from database
      const response = await fetch(`/api/scenes/${sceneId}/audio`);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to fetch audio variations', null, { status: response.status, errorText });
        throw new Error('Failed to fetch audio variations');
      }

      const audioVariations = await response.json();
      logger.info('Fetched audio variations from API', {
        audioVariations,
        firstVariationHasAudioPath: !!audioVariations[0]?.audioPath
      });

      // Update the scene with new audio variations
      setExportedScenes(prev => {
        const updated = prev.map(scene =>
          scene.id === sceneId
            ? {
                ...scene,
                audioVariations: audioVariations.map((audio: any) => ({
                  id: audio.id,
                  title: audio.title,
                  duration: audio.duration || '00:05',
                  isPlaying: false,
                  audioPath: audio.audioPath || audio.file_path  // Try audioPath first, fallback to file_path
                }))
              }
            : scene
        );

        const updatedScene = updated.find(s => s.id === sceneId);
        logger.info('Updated scene audio variations', {
          updatedSceneVariations: updatedScene?.audioVariations,
          firstVariation: updatedScene?.audioVariations[0],
          totalVariations: updatedScene?.audioVariations?.length
        });

        return updated;
      });

      logger.info('Reloaded audio variations for scene', {
        sceneId,
        variationsCount: audioVariations.length
      });
    } catch (error) {
      logger.error('Error reloading scene audio', error);
    }
  }, []);

  return (
    <SceneContext.Provider value={{
      exportedScenes,
      addExportedScenes,
      updateSceneAudioVariations,
      reloadSceneAudio,
      removeScene,
      clearAllScenes
    }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScenes() {
  const context = useContext(SceneContext);
  if (context === undefined) {
    throw new Error('useScenes must be used within a SceneProvider');
  }
  return context;
}

export type { ExportedScene, AudioVariation };