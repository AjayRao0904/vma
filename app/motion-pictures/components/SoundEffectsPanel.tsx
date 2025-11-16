"use client";

import React, { useState, useEffect } from "react";
import { logger } from "../../lib/logger";

interface AudioItem {
  id: string;
  name: string;
  description: string;
  timestamp?: number;
  type: 'sound_effect' | 'music';
}

interface SoundEffectsPanelProps {
  sceneId: string;
  sceneDuration: number;
  onClose: () => void;
}

export default function SoundEffectsPanel({ sceneId, sceneDuration, onClose }: SoundEffectsPanelProps) {
  const [soundEffects, setSoundEffects] = useState<AudioItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [customEffect, setCustomEffect] = useState({ name: "", timestamp: 0 });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAudioItems();
  }, [sceneId]);

  const loadAudioItems = async () => {
    setLoading(true);
    try {
      // Get AI-suggested sound effects for this scene
      const response = await fetch(`/api/suggest-sound-effects?sceneId=${sceneId}`);

      if (response.ok) {
        const suggestions = await response.json();
        const effects = suggestions.map((effect: any, index: number) => ({
          id: `suggestion-${index}`,
          name: effect.name,
          description: effect.description,
          timestamp: effect.timestamp || 0,
          type: 'sound_effect' as const
        }));
        setSoundEffects(effects);
      }
    } catch (error) {
      logger.error('Failed to load AI suggestions', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleGenerate = async () => {
    const effectsToGenerate = soundEffects.filter(effect => selectedItems.has(effect.id));

    if (effectsToGenerate.length === 0) {
      alert('Please select at least one sound effect to generate');
      return;
    }

    setGenerating(true);

    try {
      // Generate each selected sound effect
      for (const effect of effectsToGenerate) {
        logger.info('Generating sound effect', { name: effect.name, description: effect.description });

        const response = await fetch('/api/generate-sound-effect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: sceneId,
            soundEffectName: effect.name,
            soundEffectDescription: effect.description,
            timestamp: effect.timestamp || 0
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          logger.error('Failed to generate sound effect', errorData);
          alert(`Failed to generate "${effect.name}": ${errorData.error || 'Unknown error'}`);
          continue;
        }

        const result = await response.json();
        logger.info('Sound effect generated successfully', result);
      }

      // Trigger reload in VideoWorkspace
      window.dispatchEvent(new CustomEvent('soundEffectsGenerated', { detail: { sceneId } }));

      // Close panel
      onClose();

    } catch (error) {
      logger.error('Error generating sound effects', error);
      alert('Failed to generate sound effects. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddCustom = async () => {
    if (!customEffect.name.trim()) return;

    setGenerating(true);

    try {
      const response = await fetch('/api/generate-sound-effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: sceneId,
          soundEffectName: customEffect.name,
          soundEffectDescription: customEffect.name,
          timestamp: customEffect.timestamp
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Failed to generate custom sound effect', errorData);
        alert(`Failed to generate sound effect: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const result = await response.json();
      logger.info('Custom sound effect generated', result);

      // Reset form
      setCustomEffect({ name: "", timestamp: 0 });
      setShowCustomInput(false);

      // Close panel and trigger reload in VideoWorkspace
      window.dispatchEvent(new CustomEvent('soundEffectsGenerated', { detail: { sceneId } }));
      onClose();

    } catch (error) {
      logger.error('Error generating custom sound effect', error);
      alert('Failed to generate sound effect. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#0A0A0A] flex flex-col relative">
      {/* Generating Loading Overlay */}
      {generating && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-8 max-w-md">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-700 border-t-[#D75C35] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Generating Sound Effects</h3>
                <p className="text-gray-400 text-sm">
                  Creating your sound effects with AI...
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  This may take a few moments
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Scene</span>
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            Generate Sound Effects
          </h3>
          <p className="text-xs text-gray-500 mt-1">Select AI-recommended sound effects to generate</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#D75C35] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* AI-Recommended Sound Effects */}
            {soundEffects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#D75C35]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  Sound Effects
                </h4>
                <div className="space-y-2">
                  {soundEffects.map((effect) => (
                    <label
                      key={effect.id}
                      className="flex items-start gap-3 p-3 bg-[#1A1A1A] border border-gray-800 rounded-lg cursor-pointer hover:border-[#D75C35] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(effect.id)}
                        onChange={() => toggleItem(effect.id)}
                        className="mt-0.5 w-4 h-4 text-[#D75C35] bg-gray-700 border-gray-600 rounded focus:ring-[#D75C35] focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{effect.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{effect.description}</div>
                        {effect.timestamp !== undefined && (
                          <div className="text-xs text-[#D75C35] mt-1">@ {effect.timestamp}s</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Effect Input */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full px-4 py-2.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-gray-800 hover:border-[#D75C35] rounded-lg transition-all text-sm text-white"
              >
                + Add Custom Sound Effect
              </button>
            ) : (
              <div className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-white">Custom Sound Effect</h4>
                <input
                  type="text"
                  placeholder="Describe the sound effect..."
                  value={customEffect.name}
                  onChange={(e) => setCustomEffect({ ...customEffect, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#D75C35]"
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Timestamp (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max={sceneDuration}
                    step="0.1"
                    value={customEffect.timestamp}
                    onChange={(e) => setCustomEffect({ ...customEffect, timestamp: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0F0F0F] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#D75C35]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustom}
                    disabled={!customEffect.name.trim()}
                    className="flex-1 px-4 py-2 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomEffect({ name: "", timestamp: 0 });
                    }}
                    className="px-4 py-2 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-gray-800 text-white rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-[#0A0A0A]">
        <button
          onClick={handleGenerate}
          disabled={selectedItems.size === 0 || loading}
          className="w-full px-4 py-3 bg-[#D75C35] hover:bg-[#C14D2A] disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {selectedItems.size === 0 ? 'Select sound effects to generate' : `Generate ${selectedItems.size} sound effect${selectedItems.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
