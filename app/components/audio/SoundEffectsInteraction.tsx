"use client";

import { useState } from 'react';

interface SoundEffect {
  id: string;
  name: string;
  description: string;
}

interface SceneSoundEffects {
  sceneId: string;
  sceneName: string;
  suggestions: SoundEffect[];
}

interface SoundEffectsInteractionProps {
  scenes: SceneSoundEffects[];
  onGenerate: (sceneId: string, selectedEffects: string[]) => void;
}

export default function SoundEffectsInteraction({
  scenes,
  onGenerate
}: SoundEffectsInteractionProps) {
  const [selectedEffects, setSelectedEffects] = useState<{ [sceneId: string]: Set<string> }>({});

  const toggleEffect = (sceneId: string, effectId: string) => {
    setSelectedEffects(prev => {
      const sceneEffects = new Set(prev[sceneId] || []);
      if (sceneEffects.has(effectId)) {
        sceneEffects.delete(effectId);
      } else {
        sceneEffects.add(effectId);
      }
      return { ...prev, [sceneId]: sceneEffects };
    });
  };

  const handleGenerate = (sceneId: string) => {
    const selected = Array.from(selectedEffects[sceneId] || []);
    if (selected.length === 0) {
      alert('Please select at least one sound effect');
      return;
    }
    onGenerate(sceneId, selected);
  };

  return (
    <div className="bg-black/30 border border-white/20 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold text-lg">🔊 Sound Effects Suggestions</h3>
        <p className="text-white/60 text-sm mt-1">Select sound effects for each scene</p>
      </div>

      {/* Scenes with Sound Effect Suggestions */}
      <div className="space-y-4">
        {scenes.map((scene) => (
          <div key={scene.sceneId} className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
            {/* Scene Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">{scene.sceneName}</h4>
              <span className="text-white/60 text-xs">
                {selectedEffects[scene.sceneId]?.size || 0} selected
              </span>
            </div>

            {/* Sound Effect Suggestions */}
            <div className="grid grid-cols-1 gap-2">
              {scene.suggestions.map((effect) => {
                const isSelected = selectedEffects[scene.sceneId]?.has(effect.id);
                return (
                  <button
                    key={effect.id}
                    onClick={() => toggleEffect(scene.sceneId, effect.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/30'
                      }`}>
                        {isSelected && (
                          <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm leading-relaxed">{effect.name}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Generate Button for this Scene */}
            <button
              onClick={() => handleGenerate(scene.sceneId)}
              disabled={!selectedEffects[scene.sceneId] || selectedEffects[scene.sceneId].size === 0}
              className="w-full px-4 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✓ Generate Sound Effects for {scene.sceneName}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
