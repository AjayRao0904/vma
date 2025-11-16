"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useStudio } from "../contexts/StudioContext";
import { logger } from "../lib/logger";

// New Studio Components
import ScenesSidebar from "./components/ScenesSidebar";
import VideoWorkspace from "./components/VideoWorkspace";
import DirectorChat from "./components/DirectorChat";
import ProjectSetupDialog from "./components/ProjectSetupDialog";
import VideoUpload from "./components/VideoUpload";
import SoundEffectsPanel from "./components/SoundEffectsPanel";

interface StudioClientProps {
  projectId?: string;
}

export default function StudioClient({ projectId }: StudioClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentProject, loadProjectById } = useProject();
  const { scenes, selectedScene, addScene, setSelectedScene, loadScenes, clearScenes, addChatMessage } = useStudio();

  // Studio state
  const [showProjectSetup, setShowProjectSetup] = useState(false);
  const [projectMode, setProjectMode] = useState<'entire' | 'scenes' | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoId, setVideoId] = useState<string>('');
  const [scriptContent, setScriptContent] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [soundEffectsMode, setSoundEffectsMode] = useState(false);

  // Track if we've loaded this project to prevent infinite loops
  const loadedProjectIdRef = useRef<string | null>(null);

  // Authentication
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [session, status, router]);

  // Load project (only once per projectId)
  useEffect(() => {
    if (projectId && loadProjectById && projectId !== loadedProjectIdRef.current) {
      logger.info('Loading new project - resetting all state', { projectId, previousProjectId: loadedProjectIdRef.current });

      // Clear scenes from previous project to ensure isolation
      clearScenes();

      // Reset all project-specific state
      setProjectMode(null);
      setVideoUrl('');
      setVideoDuration(0);
      setVideoId('');
      setScriptContent('');
      setShowProjectSetup(false);
      setIsAnalyzing(false);

      // Update ref and load new project
      loadedProjectIdRef.current = projectId;
      loadProjectById(projectId);
    }
  }, [projectId, loadProjectById, clearScenes]);

  // Load video from project and detect project mode
  useEffect(() => {
    logger.info('Project data check', {
      hasCurrentProject: !!currentProject,
      currentProjectId: currentProject?.id,
      expectedProjectId: projectId,
      idsMatch: currentProject?.id === projectId
    });

    if (currentProject && currentProject.id === projectId && (currentProject as any).videos?.length) {
      const video = (currentProject as any).videos[0];

      // Set video ID
      if (video.id && !videoId) {
        setVideoId(video.id);
      }

      // Load scenes from database - ONLY on initial load
      // After initial load, trust local state as source of truth
      // (local state is updated by addScene/removeScene which also update database)
      const dbScenesData = (currentProject as any).scenes || [];
      const shouldLoadFromDB = scenes.length === 0 && dbScenesData.length > 0;

      if (shouldLoadFromDB) {
        logger.info('Initial load: Syncing scenes from database', {
          dbCount: dbScenesData.length,
          projectId: currentProject.id
        });

        // Load chat history for each scene
        Promise.all(
          dbScenesData.map(async (s: any) => {
            try {
              const chatResponse = await fetch(`/api/chat-messages?scene_id=${s.id}`);
              const chatMessages = chatResponse.ok ? await chatResponse.json() : [];

              return {
                id: s.id,
                name: s.name,
                startTime: parseFloat(s.start_time),
                endTime: parseFloat(s.end_time),
                musicTracks: [],
                sfxLayers: [],
                chatHistory: chatMessages.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.created_at
                }))
              };
            } catch (error) {
              logger.error('Error loading chat history for scene', { sceneId: s.id, error });
              return {
                id: s.id,
                name: s.name,
                startTime: parseFloat(s.start_time),
                endTime: parseFloat(s.end_time),
                musicTracks: [],
                sfxLayers: [],
                chatHistory: []
              };
            }
          })
        ).then((dbScenes) => {
          logger.info('Loaded scenes with chat history for current project', {
            projectId: currentProject.id,
            sceneCount: dbScenes.length
          });
          loadScenes(dbScenes);
        });
      } else if (scenes.length > 0) {
        logger.info('Scenes already in local state, skipping database sync', {
          localSceneCount: scenes.length,
          dbSceneCount: dbScenesData.length
        });
      }

      // Fetch presigned URL for video
      if (video.file_path && !videoUrl) { // Only fetch if not already loaded
        fetch('/api/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Keys: [video.file_path] })
        })
          .then(res => res.json())
          .then(data => {
            const presignedUrl = video.file_path ? data.urls[video.file_path] : null;
            if (presignedUrl) {
              setVideoUrl(presignedUrl);
              setVideoDuration(video.duration || 0);
              logger.info('Video loaded from project', { duration: video.duration });

              // Load project mode from database
              if (!projectMode && (currentProject as any).project_mode) {
                setProjectMode((currentProject as any).project_mode);
                logger.info('Loaded project mode from database', { mode: (currentProject as any).project_mode });
              }
            }
          })
          .catch(err => logger.error('Failed to load video URL', err));
      }
    }
  }, [currentProject, videoUrl, projectMode, videoId, scenes, loadScenes, projectId]);

  // Analysis stub - triggers after workflow selection
  const runAnalysisStub = async (mode: 'entire' | 'scenes') => {
    setIsAnalyzing(true);
    logger.info('Running analysis stub...', { mode, hasScript: !!scriptContent });

    // Simulate analysis delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsAnalyzing(false);
    setProjectMode(mode);

    // If "entire" mode, auto-create a single scene for the entire video
    // Only create if no scenes exist yet
    if (mode === 'entire' && videoDuration > 0 && scenes.length === 0) {
      const entireScene = {
        name: `Entire Video (0:00 - ${formatTime(videoDuration)})`,
        startTime: 0,
        endTime: videoDuration
      };

      // Save to database if we have videoId
      if (videoId) {
        try {
          const response = await fetch('/api/scenes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: currentProject?.id,
              video_id: videoId,
              name: entireScene.name,
              start_time: entireScene.startTime,
              end_time: entireScene.endTime
            })
          });

          if (response.ok) {
            const savedScene = await response.json();
            const newScene = {
              id: savedScene.id,
              ...entireScene,
              musicTracks: [],
              sfxLayers: [],
              chatHistory: []
            };
            addScene(newScene);
            // Auto-select the entire video scene for the chat
            setSelectedScene(newScene);
            logger.info('Created and saved entire video scene', savedScene);

            // Trigger automatic analysis for the entire video
            logger.info('Starting automatic scene analysis', { sceneId: savedScene.id });
            triggerSceneAnalysis(savedScene.id, mode);
          } else {
            const newScene = {
              ...entireScene,
              musicTracks: [],
              sfxLayers: [],
              chatHistory: []
            };
            addScene(entireScene);
            setSelectedScene(newScene as any);
            logger.info('Created entire video scene (not saved to DB)', entireScene);
          }
        } catch (error) {
          logger.error('Error saving entire video scene', error);
          const newScene = {
            ...entireScene,
            musicTracks: [],
            sfxLayers: [],
            chatHistory: []
          };
          addScene(entireScene);
          setSelectedScene(newScene as any);
        }
      } else {
        const newScene = {
          ...entireScene,
          musicTracks: [],
          sfxLayers: [],
          chatHistory: []
        };
        addScene(entireScene);
        setSelectedScene(newScene as any);
        logger.info('Created entire video scene', entireScene);
      }
    }

    logger.info('Analysis complete');
  };

  // Trigger scene analysis and store result in chat
  const triggerSceneAnalysis = async (sceneId: string, mode: 'entire' | 'scenes') => {
    try {
      logger.info('Calling analyze-scene API', { sceneId });

      const response = await fetch('/api/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId })
      });

      if (!response.ok) {
        logger.error('Scene analysis failed', { status: response.status });
        return;
      }

      const analysisData = await response.json();
      logger.info('Scene analysis complete', analysisData);

      // Create analysis summary (visible by default)
      const summary = `Scene Analysis Complete 🎬

I've analyzed ${mode === 'entire' ? 'your entire video' : 'this scene'} and here's what I found:

Visual Characteristics:
• Mood: ${analysisData.detailedAnalysis?.visualFeatures?.dominantMood || 'Not detected'}
• Lighting: ${analysisData.detailedAnalysis?.visualFeatures?.dominantLighting || 'Not detected'}
• Shot Type: ${analysisData.detailedAnalysis?.visualFeatures?.dominantShotType || 'Not detected'}
• Color Palette: ${analysisData.detailedAnalysis?.visualFeatures?.dominantColor || 'Not detected'}

Music Recommendation:
${analysisData.musicPrompt}

What would you like me to create for you?`;

      // Create detailed LLaVA raw analysis (collapsed by default)
      const rawAnalyses = analysisData.analyses || [];
      const detailedAnalysis = rawAnalyses.map((analysis: any, index: number) =>
        `Frame ${index + 1} (${analysis.timestamp}s)
${analysis.raw || 'No analysis available'}`
      ).join('\n\n─────────────────────────\n\n');

      // Combine summary and detailed analysis with separator
      const fullMessage = `${summary}

---DETAILED_ANALYSIS---
${detailedAnalysis}`;

      // Add analysis message to chat (will be saved to DB by addChatMessage)
      addChatMessage(sceneId, {
        role: 'assistant',
        content: fullMessage
      });

    } catch (error) {
      logger.error('Error during scene analysis', error);

      // Add error message to chat
      addChatMessage(sceneId, {
        role: 'assistant',
        content: 'I encountered an issue analyzing the scene. You can still describe what kind of music you\'d like and I\'ll generate it for you.'
      });
    }
  };

  // Auto-trigger analysis for scenes without chat history
  useEffect(() => {
    if (selectedScene && selectedScene.chatHistory && selectedScene.chatHistory.length === 0) {
      logger.info('Scene has no chat history, triggering analysis', { sceneId: selectedScene.id });
      triggerSceneAnalysis(selectedScene.id, projectMode || 'scenes');
    }
  }, [selectedScene?.id]);

  const handleProjectModeSelect = async (mode: 'entire' | 'scenes') => {
    setShowProjectSetup(false);
    logger.info('Project mode selected', { mode });

    // Save project mode to database
    try {
      const response = await fetch(`/api/projects/${currentProject?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_mode: mode })
      });

      if (response.ok) {
        logger.info('Project mode saved to database', { projectId: currentProject?.id, mode });
      } else {
        const errorText = await response.text();
        logger.error('Failed to save project mode', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }
    } catch (error) {
      logger.error('Error saving project mode', error);
    }

    // Run analysis stub after workflow selection
    runAnalysisStub(mode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUploadComplete = (url: string, duration: number, vId: string, script?: string) => {
    setVideoUrl(url);
    setVideoDuration(duration);
    setVideoId(vId);
    if (script) {
      setScriptContent(script);
    }
    logger.info('Video upload complete', { duration, videoId: vId, hasScript: !!script });

    // Show project setup dialog immediately
    setShowProjectSetup(true);
  };

  if (!session || !currentProject) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-gray-400">Loading project...</div>
      </div>
    );
  }

  // Show upload screen if no video
  if (!videoUrl) {
    return (
      <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
        <VideoUpload onUploadComplete={handleUploadComplete} />
      </div>
    );
  }

  // Show analyzing screen
  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#D75C35] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-2xl font-semibold text-white mb-2">Analyzing Your Video...</h2>
          <p className="text-gray-400">This will only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Left Sidebar - Scenes Navigation */}
      <ScenesSidebar
        projectMode={projectMode}
        onModeChange={setProjectMode}
        projectName={currentProject?.name}
      />

      {/* Center - Video Workspace & Timeline */}
      <VideoWorkspace
        videoUrl={videoUrl}
        videoDuration={videoDuration}
        projectMode={projectMode}
        projectId={currentProject?.id || ''}
        videoId={videoId}
        onSceneCreated={(sceneId) => triggerSceneAnalysis(sceneId, 'scenes')}
      />

      {/* Right Sidebar - Director Chat */}
      <DirectorChat
        selectedScene={selectedScene}
        projectMode={projectMode}
        soundEffectsMode={soundEffectsMode}
        onSoundEffectsModeChange={setSoundEffectsMode}
      />

      {/* Project Setup Dialog */}
      {showProjectSetup && (
        <ProjectSetupDialog
          onSelect={handleProjectModeSelect}
          onClose={() => setShowProjectSetup(false)}
        />
      )}

      {/* Sound Effects Panel - Full Screen Overlay */}
      {soundEffectsMode && selectedScene && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <SoundEffectsPanel
            sceneId={selectedScene.id}
            sceneDuration={selectedScene.endTime - selectedScene.startTime}
            onClose={() => setSoundEffectsMode(false)}
          />
        </div>
      )}
    </div>
  );
}
