"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logger } from '../lib/logger';

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface ProjectContextType {
  currentProject: ProjectData | null;
  setCurrentProject: (project: ProjectData | null) => void;
  clearProject: () => void;
  isProjectLoaded: boolean;
  loadProjectById: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<ProjectData | null>(null);
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);

  // Load project from localStorage on mount
  // DISABLED: This causes race conditions when navigating between projects
  // Instead, projects are loaded explicitly via loadProjectById()
  useEffect(() => {
    // Just mark as loaded, don't restore from localStorage
    logger.info('ProjectContext initialized - localStorage restore disabled');
    setIsProjectLoaded(true);
  }, []);

  const setCurrentProject = (project: ProjectData | null) => {
    try {
      if (project) {
        localStorage.setItem('currentProject', JSON.stringify(project));
      } else {
        localStorage.removeItem('currentProject');
      }
      setCurrentProjectState(project);
    } catch (error) {
      logger.error('Error saving project to localStorage', error);
    }
  };

  const clearProject = () => {
    try {
      localStorage.removeItem('currentProject');
      setCurrentProjectState(null);
    } catch (error) {
      logger.error('Error clearing project from localStorage', error);
    }
  };

  const loadProjectById = useCallback(async (id: string) => {
    try {
      // Clear current project FIRST to prevent loading old project's data
      logger.info('Clearing current project before loading new one', { newId: id, oldId: currentProject?.id });

      // Clear localStorage immediately to prevent stale data
      localStorage.removeItem('currentProject');
      setCurrentProjectState(null);

      logger.info('Fetching project from API', { id });
      const response = await fetch(`/api/projects/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.statusText}`);
      }

      const project = await response.json();
      logger.info('Project loaded successfully', { projectId: project.id, name: project.name });
      setCurrentProject(project);
    } catch (error) {
      logger.error('Error loading project by ID', error);
      // Optionally show error to user
    }
  }, [currentProject?.id]);

  return (
    <ProjectContext.Provider value={{
      currentProject,
      setCurrentProject,
      clearProject,
      isProjectLoaded,
      loadProjectById
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}