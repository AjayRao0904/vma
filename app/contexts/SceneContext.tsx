'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  removeScene: (sceneId: string) => void;
  clearAllScenes: () => void;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

const STORAGE_KEY = 'vma_exported_scenes';

export function SceneProvider({ children }: { children: ReactNode }) {
  const [exportedScenes, setExportedScenes] = useState<ExportedScene[]>([]);

  // Load scenes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const scenes = JSON.parse(stored);
        setExportedScenes(scenes);
      }
    } catch (error) {
      console.error('Failed to load scenes from localStorage:', error);
    }
  }, []);

  // Save scenes to localStorage whenever scenes change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exportedScenes));
    } catch (error) {
      console.error('Failed to save scenes to localStorage:', error);
    }
  }, [exportedScenes]);

  const addExportedScenes = (newScenes: ExportedScene[]) => {
    setExportedScenes(prev => {
      // Remove any existing scenes with the same sessionId to avoid duplicates
      const filtered = prev.filter(scene => 
        !newScenes.some(newScene => newScene.sessionId === scene.sessionId)
      );
      return [...filtered, ...newScenes];
    });
  };

  const updateSceneAudioVariations = (sceneId: string, variations: AudioVariation[]) => {
    setExportedScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? { ...scene, audioVariations: variations }
          : scene
      )
    );
  };

  const removeScene = (sceneId: string) => {
    setExportedScenes(prev => prev.filter(scene => scene.id !== sceneId));
  };

  const clearAllScenes = () => {
    setExportedScenes([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SceneContext.Provider value={{
      exportedScenes,
      addExportedScenes,
      updateSceneAudioVariations,
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