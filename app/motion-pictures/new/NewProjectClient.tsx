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
      
      // Store project using context for immediate use
      setCurrentProject({
        name: newProject.name,
        description: newProject.description || '',
        createdAt: newProject.createdAt,
        id: newProject.id
      });
      
      // Navigate to motion-pictures workspace
      router.push('/motion-pictures');
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