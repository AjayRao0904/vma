"use client";

interface ProjectSetupDialogProps {
  onSelect: (mode: 'entire' | 'scenes') => void;
  onClose: () => void;
}

export default function ProjectSetupDialog({ onSelect, onClose }: ProjectSetupDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#0F0F0F] border border-gray-800 rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl">
        {/* AI Avatar & Message */}
        <div className="flex gap-4 mb-8">
          {/* AI Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D75C35] to-[#FF8C42] flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          {/* AI Chat Bubble */}
          <div className="flex-1">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl rounded-tl-none p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-[#D75C35]">Director AI</span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-600">Just now</span>
              </div>
              <p className="text-white leading-relaxed mb-1">
                Great! Your video is uploaded successfully.
              </p>
              <p className="text-gray-400 leading-relaxed">
                How would you like to approach scoring? Choose the workflow that fits your project best:
              </p>
            </div>
          </div>
        </div>

        {/* Options as Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Option 1: Score Entire Video */}
          <button
            onClick={() => onSelect('entire')}
            className="w-full group bg-[#1A1A1A] hover:bg-[#222] border-2 border-gray-800 hover:border-[#D75C35] rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#D75C35]/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#D75C35]/10 group-hover:bg-[#D75C35]/20 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-[#D75C35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-white">
                    Score the Entire Video
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Fastest
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-snug">
                  Create one continuous score for your full video. Perfect for documentaries, vlogs, or single-scene content.
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#D75C35] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Option 2: Define Specific Scenes */}
          <button
            onClick={() => onSelect('scenes')}
            className="w-full group bg-[#1A1A1A] hover:bg-[#222] border-2 border-gray-800 hover:border-[#D75C35] rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#D75C35]/20"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#D75C35]/10 group-hover:bg-[#D75C35]/20 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-[#D75C35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-white">
                    Define Specific Scenes
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    More Control
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-snug">
                  Break your video into segments with unique music for each. Ideal for films, commercials, or multi-act content.
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#D75C35] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You can change your workflow anytime
          </p>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-3 py-1 rounded-md hover:bg-gray-800/50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
