"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SidePanel from "../components/layout/SidePanel";
import { useProjects } from "../hooks/useProjects";

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
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  // Format creation time for display
  const formatCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Sidebar using existing SidePanel component */}
      <div className={`${isSidebarCollapsed ? 'w-[60px]' : 'w-[320px]'} transition-all duration-300`}>
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
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              ➕ New blank project
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
            🔍
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
                    {project.description && (
                      <div className="text-white/50 text-sm mt-1 truncate">
                        {project.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        project.status === 'processing' ? 'bg-orange/20 text-orange' :
                        project.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {project.status}
                      </span>
                      <span className="text-white/50 text-xs">
                        {project.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-white/60 text-sm ml-4">
                    {formatCreatedAt(project.createdAt)}
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