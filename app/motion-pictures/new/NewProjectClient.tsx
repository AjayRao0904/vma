"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useProjects } from "../../hooks/useProjects";

export default function NewProjectClient() {
  const { data: session, status } = useSession();
  const { setCurrentProject } = useProject();
  const { createProject } = useProjects();
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [session, status, router]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    setIsLoading(true);
    
    try {
      // Create project in backend
      const newProject = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim(),
        type: 'motion-pictures'
      });
      
      if (!newProject) {
        throw new Error('Failed to create project');
      }

      // DO NOT set currentProject here - let StudioClient's loadProjectById handle it
      // This prevents race conditions with localStorage and ensures clean state

      // Navigate directly to the project's upload page
      router.push(`/motion-pictures/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg text-white flex items-center justify-center p-8">
      {/* Dashboard Button - Top Left */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
        title="Go to Dashboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        Dashboard
      </button>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Create New Project</h1>
          <p className="text-white/70 text-lg">
            Set up your motion picture project details to get started
          </p>
        </div>

        {/* Project Form */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <div className="space-y-8">
            {/* Project Name */}
            <div>
              <label htmlFor="projectName" className="block text-white font-medium text-lg mb-3">
                Project Name *
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter your project name..."
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange transition-colors"
                maxLength={100}
              />
              <div className="mt-2 text-right text-white/40 text-sm">
                {projectName.length}/100
              </div>
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="projectDescription" className="block text-white font-medium text-lg mb-3">
                Project Description
              </label>
              <textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project, goals, target audience, or any specific requirements..."
                rows={6}
                className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange transition-colors resize-none"
                maxLength={500}
              />
              <div className="mt-2 text-right text-white/40 text-sm">
                {projectDescription.length}/500
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-6">
              <button
                onClick={handleGoBack}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Back to Dashboard
              </button>
              
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || isLoading}
                className="flex-1 px-6 py-3 bg-orange hover:bg-orange/80 disabled:bg-orange/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-orange">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Pro Tips
          </h3>
          <ul className="text-white/70 space-y-2 text-sm">
            <li>• Choose a descriptive project name that's easy to identify later</li>
            <li>• Include key details like target audience, style, or campaign goals in the description</li>
            <li>• You can always edit these details later in your project settings</li>
            <li>• A clear description helps the AI generate better suggestions and content</li>
          </ul>
        </div>
      </div>
    </div>
  );
}