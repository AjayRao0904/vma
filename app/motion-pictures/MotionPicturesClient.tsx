"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useProject } from "../contexts/ProjectContext";
import { SceneProvider } from "../contexts/SceneContext";
import { 
  SidePanel, 
  ChatBox, 
  ContentViewer, 
  MediaPlayer, 
  VideoInfo 
} from "../components";

function MotionPicturesContent() {
  const { data: session, status } = useSession();
  const { currentProject, isProjectLoaded } = useProject();
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(310);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatboxWidth, setChatboxWidth] = useState(800);
  const [topSectionHeight, setTopSectionHeight] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState<'sidebar' | 'chatbox' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [session, status, router]);

  // Handle window resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (isResizing === 'sidebar') {
        const newWidth = e.clientX - containerRect.left;
        setSidebarWidth(Math.max(250, Math.min(500, newWidth)));
      } else if (isResizing === 'chatbox') {
        const newWidth = containerRect.right - e.clientX;
        setChatboxWidth(Math.max(300, Math.min(1000, newWidth)));
      } else if (isResizing === 'vertical') {
        const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
        setTopSectionHeight(Math.max(30, Math.min(70, newHeight)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleVideoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadVideoToServer(file);
      }
    };
    input.click();
  };

  const uploadVideoToServer = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('projectId', currentProject?.id || 'temp');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedVideo(file);
        setVideoUrl(result.url);
        setUploadProgress(100);
        console.log('Video uploaded successfully:', result);
        console.log('Video will be served from:', result.url);
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Failed to upload video: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      await uploadVideoToServer(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTimeUpdate = useCallback((time: number, duration: number) => {
    setCurrentVideoTime(time);
    setVideoDuration(duration);
  }, []);

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

  return (
    <div ref={containerRef} className="min-h-screen gradient-bg text-white relative overflow-hidden">
      {/* Project Header Bar */}
      {currentProject && (
        <div className="absolute top-0 left-0 right-0 h-12 bg-black/80 backdrop-blur-sm border-b border-white/10 z-40 flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange rounded-full"></div>
            <span className="text-white font-medium">{currentProject.name}</span>
            {currentProject.description && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-white/70 text-sm truncate max-w-96">{currentProject.description}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button 
              onClick={() => router.push('/motion-pictures/new')}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Edit Project
            </button>
          </div>
        </div>
      )}

      {/* Side Panel */}
      <div 
        className="absolute left-0 h-full"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          width: sidebarCollapsed ? '60px' : `${sidebarWidth}px` 
        }}
      >
        <SidePanel 
          currentPage="motion-pictures" 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
      {/* Resizable Divider for Sidebar */}
      <div 
        className="absolute h-full w-2 bg-white/20 hover:bg-orange/60 cursor-col-resize z-50 transition-colors duration-200"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          left: sidebarCollapsed ? '60px' : `${sidebarWidth}px` 
        }}
        onMouseDown={() => !sidebarCollapsed && setIsResizing('sidebar')}
      ></div>
      
      {/* Chat Box */}
      <div 
        className="absolute h-full"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          left: sidebarCollapsed ? '62px' : `${sidebarWidth + 2}px`,
          width: `${chatboxWidth}px`
        }}
      >
        <ChatBox />
      </div>
      
      {/* Resizable Divider for Chatbox */}
      <div 
        className="absolute h-full w-2 bg-white/20 hover:bg-orange/60 cursor-col-resize z-50 transition-colors duration-200"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          left: sidebarCollapsed ? `${62 + chatboxWidth}px` : `${sidebarWidth + 2 + chatboxWidth}px` 
        }}
        onMouseDown={() => setIsResizing('chatbox')}
      ></div>
      
      {/* Vertical Divider Line */}
      <div 
        className="absolute w-[11px] h-full bg-[#1B1D22]"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          left: sidebarCollapsed ? `${62 + chatboxWidth + 2}px` : `${sidebarWidth + 2 + chatboxWidth + 2}px` 
        }}
      ></div>

      {/* Main Content Area */}
      <div 
        className="absolute h-full bg-gradient-to-b from-[#0D0D0D] via-[#1F1F1F] to-[#1F1F1F] flex flex-col"
        style={{ 
          top: currentProject ? '48px' : '0px',
          height: currentProject ? 'calc(100vh - 48px)' : '100vh',
          left: sidebarCollapsed ? `${62 + chatboxWidth + 2 + 11}px` : `${sidebarWidth + 2 + chatboxWidth + 2 + 11}px`,
          width: sidebarCollapsed ? `calc(100vw - ${62 + chatboxWidth + 2 + 11}px)` : `calc(100vw - ${sidebarWidth + 2 + chatboxWidth + 2 + 11}px)`
        }}
      >
        {/* Top Half: Video Container + MediaPlayer + VideoInfo */}
        <div 
          className="flex flex-col"
          style={{ height: `${topSectionHeight}%` }}
        >
          {/* Video Container - Fixed height leaving space for controls */}
          <div 
            className="w-full bg-black overflow-hidden"
            style={{ height: 'calc(100% - 140px)' }} // Reserve 140px for MediaPlayer (60px) + VideoInfo (80px)
          >
            <div className="h-full relative" style={{ background: 'linear-gradient(180deg, rgba(13, 13, 13, 1) 42%, rgba(31, 31, 31, 1) 100%)' }}>
              {uploadedVideo && videoUrl ? (
                // Show uploaded video that fills the container completely
                <video 
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls={false}
                  preload="metadata"
                  playsInline
                  onError={(e) => {
                    console.error('Video error details:', {
                      error: e,
                      currentTarget: e.currentTarget,
                      videoSrc: e.currentTarget.src,
                      videoUrl: videoUrl,
                      networkState: e.currentTarget.networkState,
                      readyState: e.currentTarget.readyState
                    });
                    // Try to get more error details
                    if (e.currentTarget.error) {
                      console.error('Media error code:', e.currentTarget.error.code);
                      console.error('Media error message:', e.currentTarget.error.message);
                      
                      // Display user-friendly error message
                      const errorMessages = {
                        1: 'Video loading was aborted',
                        2: 'Network error while loading video',
                        3: 'Video format is not supported or corrupted',
                        4: 'Video source is not available'
                      };
                      
                      alert(`Video Error: ${errorMessages[e.currentTarget.error.code as keyof typeof errorMessages] || 'Unknown error'}`);
                    }
                  }}
                />
              ) : isUploading ? (
                // Show upload progress
                <div className="absolute inset-0 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-medium mb-2">Uploading Video...</h3>
                    <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D75C35] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-white/70 text-sm mt-2">{uploadProgress}%</p>
                  </div>
                </div>
              ) : (
                // Show upload area
                <div 
                  className="absolute inset-0 p-8 cursor-pointer hover:bg-black/20 transition-colors flex items-center justify-center"
                  onClick={handleVideoSelect}
                  onDrop={handleVideoDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="border-2 border-dashed border-white/20 rounded-[6px] p-8 w-full h-full flex flex-col items-center justify-center hover:border-[#D75C35] hover:border-opacity-50 transition-colors">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="m10 15.5 4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className="text-white text-lg font-medium mb-2">Upload Video</h3>
                    <p className="text-white/70 text-sm text-center mb-4">
                      Click to browse or drag and drop your video file here
                    </p>
                    <p className="text-white/50 text-xs text-center">
                      Supports: MP4, MOV, AVI, WebM
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* MediaPlayer Controls - Fixed height */}
          <div className="h-[60px] flex-shrink-0">
            <MediaPlayer videoRef={videoRef} onTimeUpdate={handleTimeUpdate} />
          </div>
          
          {/* VideoInfo Component - Fixed height below MediaPlayer */}
          <div className="h-[80px] flex-shrink-0">
            <VideoInfo 
              videoFile={uploadedVideo} 
              videoRef={videoRef}
              currentTime={currentVideoTime}
              duration={videoDuration}
            />
          </div>
        </div>
        
        {/* Horizontal Resizable Divider */}
        <div 
          className="h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent hover:bg-gradient-to-r hover:from-transparent hover:via-white/40 hover:to-transparent cursor-row-resize"
          onMouseDown={() => setIsResizing('vertical')}
        ></div>
        
        {/* Bottom Half: Content Viewer (Audio Variations) */}
        <div 
          className="flex-1"
          style={{ height: `${100 - topSectionHeight}%` }}
        >
          <ContentViewer />
        </div>
      </div>
    </div>
  );
}

export default function MotionPicturesClient() {
  return (
    <SceneProvider>
      <MotionPicturesContent />
    </SceneProvider>
  );
}