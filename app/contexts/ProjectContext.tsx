"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<ProjectData | null>(null);
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);

  // Load project from localStorage on mount
  useEffect(() => {
    try {
      const savedProject = localStorage.getItem('currentProject');
      if (savedProject) {
        const projectData = JSON.parse(savedProject);
        setCurrentProjectState(projectData);
      }
    } catch (error) {
      console.error('Error loading project from localStorage:', error);
    } finally {
      setIsProjectLoaded(true);
    }
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
      console.error('Error saving project to localStorage:', error);
    }
  };

  const clearProject = () => {
    try {
      localStorage.removeItem('currentProject');
      setCurrentProjectState(null);
    } catch (error) {
      console.error('Error clearing project from localStorage:', error);
    }
  };

  return (
    <ProjectContext.Provider value={{
      currentProject,
      setCurrentProject,
      clearProject,
      isProjectLoaded
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