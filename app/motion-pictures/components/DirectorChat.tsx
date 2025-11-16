"use client";

import React, { useState, useRef, useEffect } from "react";
import { Scene, MusicTrack } from "../../contexts/StudioContext";
import { useStudio } from "../../contexts/StudioContext";
import { logger } from "../../lib/logger";

interface DirectorChatProps {
  selectedScene: Scene | null;
  projectMode: 'entire' | 'scenes' | null;
  soundEffectsMode?: boolean;
  onSoundEffectsModeChange?: (mode: boolean) => void;
}

export default function DirectorChat({ selectedScene, projectMode, soundEffectsMode: externalSoundEffectsMode, onSoundEffectsModeChange }: DirectorChatProps) {
  const { addChatMessage, getChatHistory, addMusicTrack, setActiveTrack } = useStudio();
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSetup, setShowSetup] = useState(!selectedScene);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [bpm, setBpm] = useState<number>(120); // Default BPM
  const [customMusicMode, setCustomMusicMode] = useState(false); // Track if user is in custom music input mode
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use external sound effects mode if provided, otherwise use internal state
  const soundEffectsMode = externalSoundEffectsMode ?? false;
  const setSoundEffectsMode = onSoundEffectsModeChange ?? (() => {});

  const chatHistory = selectedScene ? getChatHistory(selectedScene.id) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    setShowSetup(!selectedScene);
  }, [selectedScene]);

  // Detect if analysis is in progress (scene exists but no chat messages yet)
  useEffect(() => {
    if (selectedScene && chatHistory.length === 0) {
      setIsAnalyzing(true);
    } else {
      setIsAnalyzing(false);
    }
  }, [selectedScene, chatHistory]);

  // Reset full analysis view when scene changes
  useEffect(() => {
    setShowFullAnalysis(false);
  }, [selectedScene?.id]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedScene) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message
    addChatMessage(selectedScene.id, {
      role: 'user',
      content: userMessage
    });

    // Check if this is a music description or just a casual message
    const musicKeywords = [
      'music', 'song', 'audio', 'sound', 'track', 'beat', 'melody', 'harmony', 'rhythm',
      'instrumental', 'orchestral', 'piano', 'guitar', 'drum', 'bass', 'violin', 'synth',
      'electronic', 'acoustic', 'jazz', 'rock', 'pop', 'classical', 'hip hop', 'edm',
      'fast', 'slow', 'upbeat', 'sad', 'happy', 'dark', 'bright', 'energetic', 'calm',
      'dramatic', 'cinematic', 'epic', 'ambient', 'chill', 'intense', 'peaceful',
      'tempo', 'bpm', 'chord', 'note', 'major', 'minor', 'key', 'scale',
      'compose', 'generate', 'create', 'make', 'produce'
    ];

    const casualGreetings = [
      'hello', 'hi', 'hey', 'yo', 'sup', 'greetings', 'good morning', 'good afternoon',
      'good evening', 'howdy', 'what\'s up', 'whats up', 'wassup'
    ];

    const casualQuestions = [
      'how are you', 'who are you', 'what are you', 'what can you do',
      'help', 'what is this', 'explain', 'tell me', 'show me', 'thanks', 'thank you'
    ];

    const messageLower = userMessage.toLowerCase();
    const isMusicRelated = musicKeywords.some(keyword => messageLower.includes(keyword));
    const isGreeting = casualGreetings.some(greeting => messageLower.includes(greeting));
    const isCasualQuestion = casualQuestions.some(question => messageLower.includes(question));
    const isVeryShort = userMessage.split(' ').length <= 2 && userMessage.length < 15;

    // If in custom music mode, always generate
    if (customMusicMode) {
      setCustomMusicMode(false);
      setIsGenerating(true);

      try {
        const response = await fetch('/api/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: selectedScene.id,
            prompt: userMessage,
            bpm: bpm,
            duration: selectedScene.endTime - selectedScene.startTime
          })
        });

        if (!response.ok) throw new Error('Failed to generate music');

        const data = await response.json();

        addChatMessage(selectedScene.id, {
          role: 'assistant',
          content: `✅ Music generated successfully! Your track has been created at ${bpm} BPM and is ready to play below the video.`
        });

        window.dispatchEvent(new CustomEvent('audioGenerated', { detail: { sceneId: selectedScene.id } }));

      } catch (error) {
        logger.error('Failed to generate music', error);
        addChatMessage(selectedScene.id, {
          role: 'assistant',
          content: 'Sorry, I encountered an error generating music. Please try again.'
        });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // If it's a greeting or casual question, provide guidance
    if (isGreeting || isCasualQuestion || (isVeryShort && !isMusicRelated)) {
      setIsGenerating(false);
      addChatMessage(selectedScene.id, {
        role: 'assistant',
        content: `I'm your music generation assistant! I can help you create music for your video scene. Here's how:\n\n🎵 **Generate from Current Analysis** - Use my AI analysis of your scene\n🎹 **Custom Input** - Describe your own music style\n\nOr simply type a music description like "epic orchestral music" or "calm piano melody" and I'll generate it!`
      });
      return;
    }

    // If it seems music-related, generate music
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedScene.id,
          prompt: userMessage,
          bpm: bpm,
          duration: selectedScene.endTime - selectedScene.startTime
        })
      });

      if (!response.ok) throw new Error('Failed to generate music');

      const data = await response.json();

      addChatMessage(selectedScene.id, {
        role: 'assistant',
        content: `✅ Music generated successfully! Your track has been created at ${bpm} BPM and is ready to play below the video.`
      });

      window.dispatchEvent(new CustomEvent('audioGenerated', { detail: { sceneId: selectedScene.id } }));

    } catch (error) {
      logger.error('Failed to generate music', error);
      addChatMessage(selectedScene.id, {
        role: 'assistant',
        content: 'Sorry, I encountered an error generating music. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedScene) return;

    let prompt = '';
    switch (action) {
      case 'auto':
        // Generate from current analysis - extract music recommendation from analysis
        const analysisMessage = chatHistory.find(msg => msg.role === 'assistant');
        if (analysisMessage) {
          // Extract the music recommendation from the analysis
          const content = analysisMessage.content;
          const musicRecommendationMatch = content.match(/Music Recommendation:\s*([^\n]+(?:\n(?!What would you like)[^\n]+)*)/);
          const musicPrompt = musicRecommendationMatch ? musicRecommendationMatch[1].trim() : content;

          // Auto-send the message to generate music immediately
          addChatMessage(selectedScene.id, {
            role: 'user',
            content: `Generate music from the analysis at ${bpm} BPM`
          });
          setIsGenerating(true);

          try {
            const response = await fetch('/api/generate-music', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sceneId: selectedScene.id,
                prompt: musicPrompt,
                bpm: bpm,
                duration: selectedScene.endTime - selectedScene.startTime
              })
            });

            if (!response.ok) throw new Error('Failed to generate music');

            const data = await response.json();

            addChatMessage(selectedScene.id, {
              role: 'assistant',
              content: `✅ Music generated successfully! Your track has been created at ${bpm} BPM and is ready to play below the video.`
            });

            // Trigger a custom event to reload audio tracks in VideoWorkspace
            window.dispatchEvent(new CustomEvent('audioGenerated', { detail: { sceneId: selectedScene.id } }));

          } catch (error) {
            logger.error('Failed to generate music', error);
            addChatMessage(selectedScene.id, {
              role: 'assistant',
              content: 'Sorry, I encountered an error generating the music. Please try again.'
            });
          } finally {
            setIsGenerating(false);
          }
        }
        return;

      case 'soundEffects':
        // Show sound effects panel
        setSoundEffectsMode(true);
        addChatMessage(selectedScene.id, {
          role: 'assistant',
          content: '🔊 Sound Effects panel opened! Select from AI-recommended effects or add your own custom sound effects with specific timestamps.'
        });
        return;

      case 'custom':
        // Enter custom music mode - focus input and show helper message
        setCustomMusicMode(true);
        addChatMessage(selectedScene.id, {
          role: 'assistant',
          content: `🎵 Custom music mode activated! Describe the music you want (instruments, mood, style, etc.) and I'll generate it at ${bpm} BPM.`
        });
        return;
    }

    setInputValue(prompt);
  };

  const handleGenerateSoundEffects = async (effects: any[]) => {
    if (!selectedScene || effects.length === 0) return;

    setSoundEffectsMode(false);
    setIsGenerating(true);

    addChatMessage(selectedScene.id, {
      role: 'user',
      content: `Generate ${effects.length} sound effect${effects.length > 1 ? 's' : ''}`
    });

    try {
      let successCount = 0;
      for (const effect of effects) {
        const response = await fetch('/api/generate-sound-effect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: selectedScene.id,
            soundEffectName: effect.name,
            soundEffectDescription: effect.description || effect.name,
            timestamp: effect.timestamp || 0
          })
        });

        if (response.ok) {
          successCount++;
        }
      }

      addChatMessage(selectedScene.id, {
        role: 'assistant',
        content: `✅ Successfully generated ${successCount} sound effect${successCount > 1 ? 's' : ''}! They will appear in the timeline below the video.`
      });

      // Dispatch event to reload sound effects in VideoWorkspace
      window.dispatchEvent(new CustomEvent('soundEffectsGenerated', { detail: { sceneId: selectedScene.id } }));

    } catch (error) {
      logger.error('Failed to generate sound effects', error);
      addChatMessage(selectedScene.id, {
        role: 'assistant',
        content: 'Sorry, I encountered an error generating sound effects. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!projectMode) {
    return (
      <div className="w-96 bg-[#0F0F0F] border-l border-gray-800 flex items-center justify-center p-8">
        <div className="text-center text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm">Select a project mode to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-[#0F0F0F] border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D75C35]/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-[#D75C35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Director</h3>
            <p className="text-xs text-gray-500">
              {selectedScene ? selectedScene.name : 'Entire Video'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showSetup && !selectedScene ? (
          // Initial Setup View - Master Video Section
          <div className="space-y-4">
            {projectMode === 'entire' ? (
              // Instructions for ENTIRE mode (Master Video)
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-6 h-6 text-[#D75C35] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-base font-semibold text-white mb-3">Welcome to Full Video Mode!</h4>
                    <div className="space-y-3 text-sm text-gray-300">
                      <div>
                        <p className="font-medium text-white mb-1">📹 What is Full Video Mode?</p>
                        <p className="text-xs text-gray-400">
                          This mode analyzes your entire video as one piece and generates music for the complete duration. Perfect for shorter videos or when you want consistent background music throughout.
                        </p>
                      </div>

                      <div>
                        <p className="font-medium text-white mb-1">🎬 How to Use:</p>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                          <li>Your video has been analyzed automatically</li>
                          <li>Use the chat below to describe the music you want</li>
                          <li>Generate multiple versions and compare them</li>
                          <li>Download your favorite track when ready</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-white mb-1">✂️ Need More Control?</p>
                        <p className="text-xs text-gray-400">
                          Switch to <span className="text-[#D75C35] font-medium">Scene-by-Scene Mode</span> by clicking <span className="font-medium">"+ Add Scene"</span> in the left sidebar. This lets you create different music for different parts of your video!
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-500 italic">
                          💡 Tip: Be specific with your music requests. Include mood, instruments, tempo, and genre for best results!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Instructions for SCENES mode (when no scene selected)
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[#D75C35] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <div>
                    <h4 className="text-base font-semibold text-white mb-3">Scene-by-Scene Mode</h4>
                    <div className="space-y-3 text-sm text-gray-300">
                      <div>
                        <p className="font-medium text-white mb-1">🎯 How It Works:</p>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                          <li>Click <span className="font-medium text-white">"+ Add Scene"</span> in the left sidebar</li>
                          <li>Use the scrubber to select start and end times</li>
                          <li>Each scene gets analyzed separately</li>
                          <li>Generate unique music for each scene</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-white mb-1">✨ Perfect For:</p>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                          <li>Videos with different moods or sections</li>
                          <li>Precise control over music timing</li>
                          <li>Action scenes, dialogue scenes, etc.</li>
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-500 italic">
                          💡 Tip: Create overlapping scenes to test different music options for the same moment!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Chat Messages
          <>
            {/* Analyzing Loader */}
            {isAnalyzing && (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#D75C35] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 font-medium">Analyzing scene...</p>
                  <p className="text-xs text-gray-600 mt-1">Understanding visual characteristics</p>
                </div>
              </div>
            )}

            {chatHistory.map((message, index) => (
              <React.Fragment key={message.id}>
                <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-[#D75C35] text-white'
                      : 'bg-[#1A1A1A] text-gray-300 border border-gray-800'
                  }`}
                >
                  {/* Show collapsible analysis for any assistant message with detailed analysis */}
                  {message.role === 'assistant' && message.content.includes('---DETAILED_ANALYSIS---') ? (
                    <div>
                      {(() => {
                        const [summary, detailed] = message.content.split('---DETAILED_ANALYSIS---');
                        return (
                          <>
                            {/* Summary - Always visible */}
                            <p className="text-sm whitespace-pre-wrap mb-3">{summary.trim()}</p>

                            {/* Detailed Analysis - Collapsible */}
                            <div className="border-t border-gray-700 pt-3">
                              <button
                                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#D75C35] transition-colors mb-2"
                              >
                                <svg
                                  className={`w-3 h-3 transition-transform ${showFullAnalysis ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                {showFullAnalysis ? 'Hide Full Analysis' : 'View Full Analysis'}
                              </button>
                              {showFullAnalysis && (
                                <div className="text-xs text-gray-400 whitespace-pre-wrap bg-[#0F0F0F] rounded p-3 max-h-60 overflow-y-auto">
                                  {detailed.trim()}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.attachedTrack && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <MusicTrackCard track={message.attachedTrack} sceneId={selectedScene?.id || ''} />
                    </div>
                  )}
                </div>
              </div>

              </React.Fragment>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-[#D75C35] border-t-transparent rounded-full" />
                    Generating music...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Track Versions (if multiple tracks exist) */}
      {selectedScene && selectedScene.musicTracks.length > 0 && (
        <div className="border-t border-gray-800 p-4 space-y-2 max-h-48 overflow-y-auto">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Track Versions</div>
          {selectedScene.musicTracks.map((track) => (
            <MusicTrackCard key={track.id} track={track} sceneId={selectedScene.id} />
          ))}
        </div>
      )}

      {/* Quick Actions & BPM Controls - Always visible when scene selected and not in sound effects mode */}
      {selectedScene && chatHistory.length > 0 && !soundEffectsMode && (
        <div className="border-t border-gray-800 p-4 space-y-2 bg-[#0A0A0A]">
          <p className="text-xs text-gray-500 mb-2">Quick Actions:</p>

          {/* BPM Input */}
          <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg p-3 mb-2">
            <label className="block text-xs text-gray-400 mb-2">
              Tempo (BPM)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="40"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D75C35]"
              />
              <input
                type="number"
                min="40"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(Math.max(40, Math.min(200, parseInt(e.target.value) || 120)))}
                readOnly
                onKeyDown={(e) => {
                  // Allow arrow keys to work
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setBpm(Math.min(200, bpm + 1));
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setBpm(Math.max(40, bpm - 1));
                  }
                }}
                className="w-16 px-2 py-1 bg-[#1A1A1A] border border-gray-700 rounded text-sm text-white text-center focus:outline-none focus:border-[#D75C35] cursor-default"
              />
              <span className="text-xs text-gray-500">BPM</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Slow</span>
              <span>Medium</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Action Buttons - Three buttons */}
          <button
            onClick={() => handleQuickAction('auto')}
            disabled={isGenerating}
            className="w-full text-left px-4 py-2.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-gray-800 hover:border-[#D75C35] rounded-lg transition-all disabled:opacity-50"
          >
            <div className="text-sm font-medium text-white">Generate from Current Analysis</div>
            <div className="text-xs text-gray-500 mt-0.5">Use the AI's video analysis at {bpm} BPM</div>
          </button>
          <button
            onClick={() => handleQuickAction('soundEffects')}
            disabled={isGenerating}
            className="w-full text-left px-4 py-2.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-gray-800 hover:border-[#D75C35] rounded-lg transition-all disabled:opacity-50"
          >
            <div className="text-sm font-medium text-white">Generate Sound Effects</div>
            <div className="text-xs text-gray-500 mt-0.5">Add AI-recommended or custom sound effects</div>
          </button>
          <button
            onClick={() => handleQuickAction('custom')}
            disabled={isGenerating}
            className="w-full text-left px-4 py-2.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-gray-800 hover:border-[#D75C35] rounded-lg transition-all disabled:opacity-50"
          >
            <div className="text-sm font-medium text-white">Custom Input</div>
            <div className="text-xs text-gray-500 mt-0.5">Add your own details to the analysis</div>
          </button>
        </div>
      )}

      {/* Regular Input - Hide when sound effects panel is open */}
      {selectedScene && !soundEffectsMode && (
        <div className="p-4 border-t border-gray-800 bg-gradient-to-t from-[#0F0F0F] to-transparent">
          {/* Custom Music Mode Indicator */}
          {customMusicMode && (
            <div className="mb-2 px-3 py-2 bg-[#D75C35]/10 border border-[#D75C35]/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  <span className="text-xs text-[#D75C35] font-medium">Custom Music Mode • {bpm} BPM</span>
                </div>
                <button
                  onClick={() => setCustomMusicMode(false)}
                  className="text-[#D75C35] hover:text-[#C14D2A] text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={customMusicMode ? "Describe your custom music..." : "Describe the music you want..."}
              className={`flex-1 bg-[#1A1A1A] border ${customMusicMode ? 'border-[#D75C35]' : 'border-gray-700'} rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#D75C35] shadow-lg shadow-[#D75C35]/10 hover:shadow-[#D75C35]/20 transition-shadow`}
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || !inputValue.trim()}
              className="px-4 py-2 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors shadow-lg shadow-[#D75C35]/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Music Track Card Component
function MusicTrackCard({ track, sceneId }: { track: MusicTrack; sceneId: string }) {
  const { setActiveTrack } = useStudio();
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    // TODO: Implement audio playback
    setIsPlaying(!isPlaying);
  };

  const handleSelect = () => {
    setActiveTrack(sceneId, track.id);
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        track.isActive
          ? 'bg-[#D75C35]/10 border-[#D75C35]'
          : 'bg-[#1A1A1A] border-gray-800 hover:border-gray-700'
      }`}
      onClick={handleSelect}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
          className="w-8 h-8 bg-[#D75C35]/20 hover:bg-[#D75C35]/30 rounded-full flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <svg className="w-3 h-3 text-[#D75C35]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-[#D75C35] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">{track.title}</div>
          <div className="text-xs text-gray-500">{track.duration}s</div>
        </div>
        {track.isActive && (
          <div className="text-xs text-[#D75C35] font-medium">Active</div>
        )}
      </div>
      <div className="text-xs text-gray-600 line-clamp-2">{track.prompt}</div>
    </div>
  );
}
