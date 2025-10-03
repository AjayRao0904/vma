'use client'

import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useVoiceRecording } from '../../hooks/useVoiceRecording'
import { MicIcon } from '../voice/MicIcon'
import { VoiceBar } from '../voice/VoiceBar'
import { voiceMessageHandler } from '../../utils/voiceMessageHandler'

interface ChatBoxProps {
  className?: string
}

export default function ChatBox({ className = '' }: ChatBoxProps) {
  const [inputText, setInputText] = useState('')
  const [lyricsEnabled, setLyricsEnabled] = useState(false)
  const [isSendingVoice, setIsSendingVoice] = useState(false)
  
  // Voice recording functionality
  const {
    isRecording,
    isFinished,
    recordingTime,
    audioLevel,
    audioBlob,
    startRecording,
    stopRecording,
    approveRecording,
    clearRecording,
    error
  } = useVoiceRecording()

  // Load voice messages on component mount
  useEffect(() => {
    voiceMessageHandler.loadFromStorage()
  }, [])

  const handleMicToggle = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      try {
        await startRecording()
      } catch (err) {
        console.error('Failed to start recording:', err)
      }
    }
  }

  const handleApproveRecording = async () => {
    console.log('handleApproveRecording called:', { audioBlob: !!audioBlob, recordingTime, isFinished });
    if (audioBlob && recordingTime > 0) {
      setIsSendingVoice(true)
      
      try {
        // Save the voice message
        const messageId = voiceMessageHandler.saveVoiceMessage(audioBlob, recordingTime)
        
        // Generate waveform data for visualization
        const waveformData = await voiceMessageHandler.generateWaveformData(audioBlob)
        await voiceMessageHandler.updateVoiceMessage(messageId, { waveformData })
        
        // Send to backend (placeholder)
        const success = await voiceMessageHandler.sendVoiceMessage(messageId)
        
        if (success) {
          console.log('Voice message sent successfully:', messageId)
          // Here you might want to add the message to a chat context
          // or trigger a callback to update the UI
        } else {
          console.error('Failed to send voice message')
        }
        
        clearRecording()
        approveRecording() // Clear the finished state
      } catch (err) {
        console.error('Error processing voice message:', err)
      } finally {
        setIsSendingVoice(false)
      }
    }
  }

  // Handle microphone approval when user clicks tick
  const handleMicApproval = async () => {
    console.log('handleMicApproval called:', { audioBlob: !!audioBlob, recordingTime });
    // Always process and send the recording when tick is clicked
    if (audioBlob) {
      await handleApproveRecording();
    } else {
      console.log('No audioBlob available');
    }
  };

  const handleScriptUpload = () => {
    console.log('Opening script file dialog...');
    // In a real app, this would open a file dialog
    alert('Script upload functionality would open here');
  }

  const handleAudioReference = () => {
    console.log('Opening audio reference dialog...');
    // In a real app, this would open an audio file dialog
    alert('Audio reference upload functionality would open here');
  }

  const handleLyricsToggle = () => {
    setLyricsEnabled(!lyricsEnabled);
    console.log(lyricsEnabled ? 'Disabled lyrics' : 'Enabled lyrics');
  }

  const handleInputSubmit = () => {
    if (inputText.trim()) {
      console.log('Submitting director input:', inputText);
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
          {/* Input Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleScriptUpload}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white/3 rounded-[40px] hover:bg-white/5 transition-colors flex-shrink-0"
              title="Upload script file"
            >
              <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                <PlusIcon className="w-[15.63px] h-[15.63px] text-black" />
              </div>
              <span className="text-white text-[14px] font-normal leading-[1.48] font-['Poppins'] whitespace-nowrap">
                Script
              </span>
            </button>

            <button 
              onClick={handleAudioReference}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white/3 rounded-[40px] hover:bg-white/5 transition-colors flex-shrink-0"
              title="Upload audio reference"
            >
              <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                <PlusIcon className="w-[15.63px] h-[15.63px] text-black" />
              </div>
              <span className="text-white text-[14px] font-normal leading-[1.48] font-['Poppins'] whitespace-nowrap">
                Audio Reference
              </span>
            </button>
          </div>

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
                disabled={isRecording}
              />
            </div>

            {/* Lyrics Toggle */}
            <div className="flex items-center gap-2 px-3 flex-shrink-0">
              <span className="text-white text-[12px] font-normal leading-[1.4] font-['Poppins']">
                Lyrics
              </span>
              <div className="w-[50px] h-[28px]">
                <button
                  onClick={handleLyricsToggle}
                  className={`w-full h-full rounded-[72.41px] transition-colors ${
                    lyricsEnabled ? 'bg-orange' : 'bg-black/90'
                  }`}
                  title={lyricsEnabled ? 'Disable lyrics' : 'Enable lyrics'}
                  disabled={isRecording}
                >
                  <div
                    className={`w-[22px] h-[22px] bg-white rounded-full transition-transform duration-200 ${
                      lyricsEnabled ? 'translate-x-[25px]' : 'translate-x-[3px]'
                    } mt-[3px]`}
                  />
                </button>
              </div>
            </div>

            {/* Microphone Controls */}
            <div className="flex items-center gap-1 pr-4">
              <MicIcon
                isRecording={isRecording}
                isFinished={isFinished}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onApprove={handleMicApproval}
                size="md"
              />
            </div>
          </div>

          {/* Voice Recording Bar */}
          {(isRecording || isFinished) && (
            <div className="mt-2">
              <VoiceBar
                audioLevel={audioLevel}
                isRecording={isRecording}
                isFinished={isFinished}
                onTimeUp={stopRecording}
              />
            </div>
          )}

          {/* Recording Complete Actions */}
          {isFinished && audioBlob && (
            <div className="mt-2 p-3 bg-black/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm">
                  Recording complete ({Math.round(audioBlob.size / 1024)}KB, {recordingTime}s)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearRecording}
                  className="px-3 py-1 bg-black/60 text-white rounded text-sm hover:bg-black/80 transition-colors"
                  disabled={isSendingVoice}
                >
                  Delete
                </button>
                <button
                  onClick={handleApproveRecording}
                  className="px-3 py-1 bg-orange text-white rounded text-sm hover:bg-orange/80 transition-colors disabled:opacity-50"
                  disabled={isSendingVoice}
                >
                  {isSendingVoice ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
