"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SidePanel from "../components/layout/SidePanel";
import { useProjects } from "../hooks/useProjects";
import ClientTimeDisplay from "../components/ClientTimeDisplay";

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Backend-connected project management
  const {
    projects,
    loading,
    error,
    pagination,
    fetchProjects
  } = useProjects();

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingProjectId(projectId);

    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Refresh projects list
      fetchProjects(searchQuery);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) router.push("/login");
  }, [session, status, router]);

  // Handle search with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (session?.user?.email) {
        fetchProjects(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, fetchProjects, session?.user?.email]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center" suppressHydrationWarning>
        <div className="text-white text-xl" suppressHydrationWarning>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }



  return (
    <div className="min-h-screen gradient-bg flex" suppressHydrationWarning>
      {/* Sidebar using existing SidePanel component */}
      <div className={`${isSidebarCollapsed ? 'w-[60px]' : 'w-[320px]'} transition-all duration-300`} suppressHydrationWarning>
        <SidePanel 
          currentPage="motion-pictures"
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-white text-3xl font-bold">Studio</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/motion-pictures/new')}
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-black">
                <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 text-white px-4 py-3 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-orange border border-white/20"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-white text-xl font-semibold mb-6">Recent Projects</h2>
          
          {/* Projects Table Header */}
          <div className="flex justify-between items-center text-white/60 text-sm mb-4 border-b border-white/20 pb-2">
            <div>Title</div>
            <div>Created at</div>
          </div>

          {/* Projects List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-white/60">Loading projects...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-red-400">Error: {error}</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-white/60 mb-4">No projects found</div>
                <button 
                  onClick={() => router.push('/motion-pictures/new')}
                  className="px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/80 transition-colors"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="flex justify-between items-center text-white hover:bg-white/5 p-3 rounded-lg cursor-pointer group"
                  onClick={() => router.push(`/motion-pictures/${project.id}`)}
                >
                  <div className="flex-1">
                    <div className="text-white/90 group-hover:text-white font-medium">
                      {project.name}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-white/50 text-xs">
                        {project.description || 'No description'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ClientTimeDisplay 
                      createdAt={project.createdAt} 
                      className="text-white/60 text-sm"
                    />
                    <button
                      onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                      disabled={deletingProjectId === project.id}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm border border-red-500/30"
                      title="Delete project"
                    >
                      {deletingProjectId === project.id ? 'Deleting...' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => fetchProjects(searchQuery, (pagination?.currentPage || 1) - 1)}
                disabled={!pagination?.hasPrev || loading}
                className="px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
              >
                Previous
              </button>
              <span className="text-white/60">
                Page {pagination?.currentPage || 1} of {pagination?.totalPages || 1}
              </span>
              <button
                onClick={() => fetchProjects(searchQuery, (pagination?.currentPage || 1) + 1)}
                disabled={!pagination?.hasNext || loading}
                className="px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}