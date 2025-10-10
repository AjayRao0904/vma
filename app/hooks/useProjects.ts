import { useState, useCallback } from 'react';
import { logger } from '../lib/logger';

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

  const fetchProjects = useCallback(async (searchQuery: string = '', page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();

      setProjects(data.projects || []);
      setPagination(data.pagination || null);
    } catch (err) {
      logger.error('Error fetching projects', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      setProjects([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData: Partial<Project>) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }

      const newProject = await response.json();
      return newProject;
    } catch (err) {
      logger.error('Error creating project', err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, projectData: Partial<Project>) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...projectData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`);
      }

      const updatedProject = await response.json();
      return updatedProject;
    } catch (err) {
      logger.error('Error updating project', err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (err) {
      logger.error('Error deleting project', err);
      return false;
    }
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
