'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useChat } from '../../contexts/ChatContext'
import { useScenes } from '../../contexts/SceneContext'
import PromptInteraction from '../audio/PromptInteraction'
import SoundEffectsInteraction from '../audio/SoundEffectsInteraction'
import ClientDateDisplay from '../ClientDateDisplay'
import { logger } from '../../lib/logger'

interface ChatBoxProps {
  className?: string
}

export default function ChatBox({ className = '' }: ChatBoxProps) {
  const [inputText, setInputText] = useState('')
  const [isFetchingSoundEffects, setIsFetchingSoundEffects] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Chat context
  const { messages, isLoading, sendMessage, addPromptMessage, setActionHandler } = useChat()
  const { exportedScenes, reloadSceneAudio } = useScenes()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputSubmit = async () => {
    if (inputText.trim() && !isLoading) {
      const message = inputText.trim()
      setInputText('') // Clear input immediately
      await sendMessage(message)
    }
  }

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  }

  const handleRegenerate = async () => {
    await sendMessage('Regenerate the last music with a different approach')
  }

  const handleSoundEffects = useCallback(async () => {
    if (exportedScenes.length === 0) {
      logger.warn('No scenes available for sound effects')
      return
    }

    if (isFetchingSoundEffects) {
      logger.warn('Already fetching sound effects, skipping duplicate request')
      return
    }

    try {
      setIsFetchingSoundEffects(true)
      logger.info('Fetching sound effects suggestions')

      const sceneIds = exportedScenes.map(s => s.id)
      const response = await fetch('/api/suggest-sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneIds })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to suggest sound effects')
      }

      const result = await response.json()
      logger.info('Sound effects suggestions received', { result })

      // Add sound effects interactive message
      addPromptMessage({
        type: 'sound-effects',
        scenes: result.scenes
      } as any)

    } catch (error) {
      logger.error('Error suggesting sound effects', error)
    } finally {
      setIsFetchingSoundEffects(false)
    }
  }, [exportedScenes, addPromptMessage, isFetchingSoundEffects, setIsFetchingSoundEffects])

  const handleGenerateMusic = useCallback(async (sceneId: string, prompt: string) => {
    try {
      logger.info('Calling music generation API', { sceneId, prompt })

      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, prompt })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        logger.error('Music generation API error', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to generate music')
      }

      const result = await response.json()
      logger.info('Music generated successfully', { result })

      // Reload audio variations for the scene
      await reloadSceneAudio(sceneId)

      logger.info('Audio variations reloaded for scene', { sceneId })

    } catch (error) {
      logger.error('Error generating music', error)
    }
  }, [reloadSceneAudio])

  const handleGenerateSoundEffects = async (
    sceneId: string,
    selectedEffectIds: string[],
    allScenes: Array<{ sceneId: string; sceneName: string; suggestions: Array<{ id: string; name: string; description: string }> }>
  ) => {
    try {
      const scene = allScenes.find(s => s.sceneId === sceneId)
      if (!scene) {
        logger.warn('Scene not found')
        return
      }

      const selectedEffects = scene.suggestions.filter(s => selectedEffectIds.includes(s.id))

      if (selectedEffects.length === 0) {
        logger.warn('No sound effects selected')
        return
      }

      logger.info('Generating sound effects', { count: selectedEffects.length })

      for (const effect of selectedEffects) {
        logger.info('Generating sound effect', {
          sceneId,
          name: effect.name,
          description: effect.description
        })

        const response = await fetch('/api/generate-sound-effect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId,
            soundEffectName: effect.name,
            soundEffectDescription: effect.description
          })
        })

        logger.info('Sound effect API response received', { status: response.status })

        if (!response.ok) {
          const errorText = await response.text()

          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { error: 'Failed to parse error response', details: errorText }
          }

          logger.error('Failed to generate sound effect', errorData, {
            effectName: effect.name
          })
          continue
        }

        const result = await response.json()
        logger.info('Sound effect generated', {
          effectName: effect.name,
          result
        })
      }

      // Reload audio variations for the scene
      await reloadSceneAudio(sceneId)

      logger.info('All sound effects generated successfully')

    } catch (error) {
      logger.error('Error generating sound effects', error)
    }
  }

  // Register action handler for AI-triggered actions
  useEffect(() => {
    logger.info('Setting up action handler in ChatBoxNew', {
      hasHandleGenerateMusic: !!handleGenerateMusic,
      hasHandleSoundEffects: !!handleSoundEffects,
      hasSendMessage: !!sendMessage
    })
    setActionHandler(async (action: string, data: any) => {
      logger.info('Action triggered from AI', { action, data })

      switch (action) {
        case 'generate-music':
          logger.info('Generate music action', {
            sceneId: data.sceneId,
            prompt: data.prompt
          })
          if (data.sceneId) {
            // Use provided prompt or fallback to generic prompt
            const prompt = data.prompt || 'cinematic instrumental'
            logger.info('Calling handleGenerateMusic', {
              sceneId: data.sceneId,
              prompt
            })
            await handleGenerateMusic(data.sceneId, prompt)
          } else {
            logger.warn('No scene ID provided for music generation')
          }
          break

        case 'generate-sound-effects':
          await handleSoundEffects()
          break

        case 'analyze-scene':
          if (data.sceneId) {
            await sendMessage(`Analyzing scene ${data.sceneId}...`)
          }
          break

        default:
          logger.warn('Unknown action from AI', { action })
      }
    })
  }, [setActionHandler, handleGenerateMusic, handleSoundEffects, sendMessage])

  return (
    <div className={`w-full h-full bg-black/20 backdrop-blur-sm flex flex-col relative ${className}`}>
      {/* Chat Header - Moved up */}
      <div className="bg-gradient-to-b from-[#1F1F1F] to-transparent px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-end gap-4">
          <h1 className="text-white text-[36px] font-normal leading-[1.2] tracking-[-2%] font-['Poppins']">
            Director's
          </h1>
          <h1 className="text-white text-[40px] font-normal leading-[1.2] italic font-['Times_New_Roman']">
            input
          </h1>
        </div>
      </div>

      {/* Action Buttons - Moved below header */}
      {messages.length > 0 && (
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-orange/20 hover:bg-orange/30 rounded-lg border border-orange/50 transition-colors disabled:opacity-50"
              title="Regenerate last music"
            >
              <ArrowPathIcon className="w-4 h-4 text-orange" />
              <span className="text-orange text-sm">Regenerate</span>
            </button>
            <button
              onClick={handleSoundEffects}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors disabled:opacity-50"
              title="Suggest sound effects"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="text-white text-sm">Sound Effects</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/70 text-[18px] font-normal leading-[1.4] text-center font-['Poppins'] max-w-[280px]">
              Start chatting to create music for your scenes!
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Interactive prompt message (scene analysis) */}
                {message.promptData?.type === 'scene-analysis' ? (
                  <div className="w-full">
                    <PromptInteraction
                      sceneId={message.promptData.sceneId}
                      sceneName={message.promptData.sceneName}
                      musicPrompt={message.promptData.musicPrompt}
                      detailedAnalysis={message.promptData.detailedAnalysis}
                      rawAnalyses={message.promptData.rawAnalyses}
                      onGenerateMusic={handleGenerateMusic}
                    />
                  </div>
                ) : message.promptData?.type === 'sound-effects' ? (
                  <div className="w-full">
                    <SoundEffectsInteraction
                      scenes={message.promptData.scenes}
                      onGenerate={async (sceneId, selectedEffects) => {
                        if (message.promptData?.type === 'sound-effects') {
                          await handleGenerateSoundEffects(sceneId, selectedEffects, message.promptData.scenes)
                        }
                      }}
                    />
                  </div>
                ) : (
                  /* Regular text message */
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-orange text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <ClientDateDisplay 
                      date={message.created_at}
                      className="text-xs opacity-50 mt-1"
                      format="time"
                    />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Section - At bottom */}
      <div className="p-4 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm border-t border-white/10">
        <div className="space-y-3">
          {/* Text Field with highlighting */}
          <div className="relative bg-gradient-to-r from-orange/10 to-white/5 rounded-[10px] min-h-[56px] flex items-center border-2 border-orange/30 hover:border-orange/50 focus-within:border-orange transition-all shadow-lg shadow-orange/10">
            {/* Input Text */}
            <div className="flex-1 px-4 py-3">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleInputKeyPress}
                className="w-full bg-transparent text-white text-[15px] font-normal leading-[1.4] font-['Poppins'] outline-none placeholder-white/40"
                placeholder="Type your music direction here..."
                disabled={isLoading}
              />
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-2 pr-3">
              <button
                onClick={handleInputSubmit}
                disabled={!inputText.trim() || isLoading}
                className="p-3 bg-orange hover:bg-orange/90 rounded-lg text-white transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-white/40 shadow-lg shadow-orange/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
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
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
