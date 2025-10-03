import { useState, useCallback } from 'react';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  type: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchProjects = useCallback(async (searchQuery = '', page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Sample Video Project',
          description: 'A sample video editing project',
          status: 'completed' as const,
          type: 'video',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      
      setProjects(mockProjects);
      setPagination({
        currentPage: page,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10,
        hasPrev: false,
        hasNext: false,
      });
    } catch (err) {
      setError('Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: Partial<Project>): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock implementation - create a new project
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        status: 'draft',
        type: projectData.type || 'motion-pictures',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'mock-user-id'
      };
      
      // Add to projects list
      setProjects(prev => [newProject, ...prev]);
      
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id: string, projectData: Partial<Project>): Promise<Project | null> => {
    // Mock implementation
    return null;
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    // Mock implementation
    return false;
  }, []);
  const refreshProjects = useCallback(async () => {
    await fetchProjects('', 1);
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    pagination,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
};
