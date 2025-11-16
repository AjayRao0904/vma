"use client";

export default function GeneratingPreviewModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-8 max-w-md">
        <div className="flex flex-col items-center gap-6">
          {/* Animated Loader */}
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-700 border-t-[#D75C35] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Generating Preview</h3>
            <p className="text-gray-400 text-sm">
              Mixing audio tracks and sound effects...
            </p>
            <p className="text-gray-500 text-xs mt-2">
              This may take a few moments
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Downloading audio files...</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Processing with FFmpeg...</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Syncing audio to video timeline...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
