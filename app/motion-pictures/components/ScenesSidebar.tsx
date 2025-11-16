"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "../../contexts/StudioContext";

interface ScenesSidebarProps {
  projectMode: 'entire' | 'scenes' | null;
  onModeChange: (mode: 'entire' | 'scenes' | null) => void;
  projectName?: string;
}

export default function ScenesSidebar({ projectMode, onModeChange, projectName }: ScenesSidebarProps) {
  const router = useRouter();
  const { scenes, selectedScene, setSelectedScene, removeScene, getChatHistory } = useStudio();
  const [deletingSceneId, setDeletingSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detect if scenes are being analyzed (no chat history yet)
  useEffect(() => {
    if (projectMode === 'entire' && scenes.length > 0) {
      const entireScene = scenes[0];
      const chatHistory = getChatHistory(entireScene.id);
      setIsLoading(chatHistory.length === 0);
    } else {
      setIsLoading(false);
    }
  }, [scenes, projectMode, getChatHistory]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-80 bg-[#0F0F0F] border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        {/* Back to Dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-3 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </button>

        <h2 className="text-lg font-semibold text-white mb-1">{projectName || 'My Project'}</h2>
        <p className="text-xs text-gray-500">
          {projectMode === 'entire' ? 'Single Score Mode' : projectMode === 'scenes' ? 'Scene-Based Mode' : 'Choose workflow to start'}
        </p>
      </div>

      {/* Scenes List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {/* Loading State - Show when analyzing entire video */}
          {isLoading && projectMode === 'entire' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 mb-4 border-4 border-[#D75C35] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Analyzing video...</p>
              <p className="text-xs text-gray-600 mt-1">Understanding visual characteristics</p>
            </div>
          ) : (
            <>
              {/* Master Video - Always show when projectMode is set */}
              {projectMode && (
                <div
                  className={`group relative bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border rounded-lg p-3 transition-all cursor-pointer ${
                    selectedScene === null
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedScene(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <div className="text-sm font-semibold text-white">Master Video</div>
                    <span className="ml-auto text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">Full</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Complete uncut version
                  </div>
                </div>
              )}
            </>
          )}

          {/* Show scenes for both modes - but not during loading */}
          {!isLoading && scenes.length > 0 ? (
            <>
              {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`group relative bg-[#1A1A1A] border rounded-lg p-3 transition-all cursor-pointer ${
                  selectedScene?.id === scene.id
                    ? 'border-[#D75C35] ring-2 ring-[#D75C35]/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setSelectedScene(scene)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">{scene.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                    </div>
                  </div>
                  {projectMode === 'scenes' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();

                        // Prevent duplicate clicks while deleting
                        if (deletingSceneId === scene.id) {
                          return;
                        }

                        try {
                          setDeletingSceneId(scene.id);
                          await removeScene(scene.id);
                        } catch (error) {
                          console.error('Failed to delete scene:', error);
                          alert('Failed to delete scene. Please try again.');
                        } finally {
                          setDeletingSceneId(null);
                        }
                      }}
                      disabled={deletingSceneId === scene.id}
                      className={`${
                        deletingSceneId === scene.id
                          ? 'opacity-100 text-gray-600 cursor-wait'
                          : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500'
                      } transition-opacity`}
                    >
                      {deletingSceneId === scene.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>

                {/* Track & SFX Count */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>{scene.musicTracks.length} tracks</span>
                  <span>•</span>
                  <span>{scene.sfxLayers.length} SFX</span>
                </div>
              </div>
            ))}
            </>
          ) : !isLoading && projectMode !== 'scenes' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 mb-1">No scenes yet</p>
              <p className="text-xs text-gray-600">
                Choose a workflow to get started
              </p>
            </div>
          ) : projectMode === 'scenes' && !isLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-1">No scenes defined yet</p>
              <p className="text-xs text-gray-600">
                Use the scrubber below to add scenes
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
