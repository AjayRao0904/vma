'use client'

import { useState } from 'react'
import { logger } from '../../lib/logger'

interface ChatBoxProps {
  className?: string
}

export default function ChatBox({ className = '' }: ChatBoxProps) {
  const [inputText, setInputText] = useState('')

  const handleInputSubmit = () => {
    if (inputText.trim()) {
      logger.info('Submitting director input', { inputText });
      // In a real app, this would process the input
      alert(`Processing: "${inputText}"`);
      setInputText(''); // Clear input after submission
    }
  }

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }

  return (
    <div className={`w-full h-full bg-black/20 backdrop-blur-sm flex flex-col relative ${className}`}>
      {/* Chat Header */}
      <div className="h-[108px] bg-gradient-to-b from-[#1F1F1F] to-transparent px-6 pt-6 flex-shrink-0">
        <div className="flex items-end gap-4">
          <h1 className="text-white text-[36px] font-normal leading-[1.2] tracking-[-2%] font-['Poppins']">
            Director's
          </h1>
          <h1 className="text-white text-[40px] font-normal leading-[1.2] italic font-['Times_New_Roman']">
            input
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <p className="text-white/70 text-[18px] font-normal leading-[1.4] text-center font-['Poppins'] max-w-[280px]">
          Add your scene to start creating music for it.
        </p>
      </div>

      {/* Input Section - At bottom */}
      <div className="p-4 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm border-t border-white/10">
        <div className="space-y-3">
          {/* Text Field */}
          <div className="relative bg-white/3 rounded-[10px] min-h-[48px] flex items-center">
            {/* Input Text */}
            <div className="flex-1 px-4 py-3">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleInputKeyPress}
                className="w-full bg-transparent text-white text-[14px] font-normal leading-[1.4] font-['Poppins'] outline-none placeholder-white/20"
                placeholder="Direct your music here"
              />
            </div>

            {/* Send Button */}
            <div className="flex items-center pr-4">
              <button
                onClick={handleInputSubmit}
                disabled={!inputText.trim()}
                className="p-2 bg-orange hover:bg-orange/80 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg transition-colors"
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
