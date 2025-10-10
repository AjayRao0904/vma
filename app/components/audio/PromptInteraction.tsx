"use client";

import { useState } from 'react';
import { logger } from '../../lib/logger';

interface DetailedAnalysis {
  framesAnalyzed: number;
  sceneDuration: number;
  visualFeatures: {
    dominantMood: string;
    dominantLighting: string;
    dominantShotType: string;
    dominantColor: string;
  };
  frameByFrameAnalysis: Array<{
    frame: number;
    timestamp: number;
    lighting: string;
    shot_type: string;
    mood: string;
    camera_angle: string;
    raw?: string; // Add raw LLaVA response
  }>;
}

interface PromptInteractionProps {
  sceneId: string;
  sceneName: string;
  musicPrompt: string;
  detailedAnalysis: DetailedAnalysis;
  rawAnalyses?: Array<{ timestamp: number; raw: string; lighting: string; mood: string; shot_type: string; camera_angle: string; }>; // Add raw analyses
  onGenerateMusic: (sceneId: string, prompt: string) => void;
}

export default function PromptInteraction({
  sceneId,
  sceneName,
  musicPrompt,
  detailedAnalysis,
  rawAnalyses,
  onGenerateMusic
}: PromptInteractionProps) {
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(detailedAnalysis.visualFeatures);
  const [currentPrompt, setCurrentPrompt] = useState(musicPrompt);
  const [showRawAnalysis, setShowRawAnalysis] = useState(false);

  const handleEditAnalysis = () => {
    setIsEditingAnalysis(true);
  };

  const handleSaveAnalysis = () => {
    // Regenerate prompt based on edited analysis
    const newPrompt = generatePromptFromAnalysis(editedAnalysis);
    setCurrentPrompt(newPrompt);
    setIsEditingAnalysis(false);
    logger.info('Prompt updated based on edits', { newPrompt });

    // Automatically generate music with the new prompt
    onGenerateMusic(sceneId, newPrompt);
  };

  // Update prompt whenever edited analysis changes (real-time preview)
  const handleAnalysisChange = (field: keyof typeof editedAnalysis, value: string) => {
    const updated = { ...editedAnalysis, [field]: value };
    setEditedAnalysis(updated);
    // Generate and preview new prompt in real-time
    const newPrompt = generatePromptFromAnalysis(updated);
    setCurrentPrompt(newPrompt);
  };

  const handleCancelEdit = () => {
    setEditedAnalysis(detailedAnalysis.visualFeatures);
    setIsEditingAnalysis(false);
  };

  const handleGenerateMusic = () => {
    onGenerateMusic(sceneId, currentPrompt);
  };

  // Generate music prompt from visual analysis using ElevenLabs best practices
  const generatePromptFromAnalysis = (analysis: typeof editedAnalysis): string => {
    // Map moods to detailed musical descriptors with genre, instrumentation, and emotional qualities
    const moodMap: Record<string, { genre: string; instruments: string; feel: string; tempo: string; key?: string }> = {
      tense: {
        genre: 'cinematic thriller',
        instruments: 'deep staccato strings, pulsing synthesizers, subtle percussion',
        feel: 'building tension, suspenseful undertones',
        tempo: '100-120 BPM',
        key: 'D minor'
      },
      dramatic: {
        genre: 'epic orchestral',
        instruments: 'powerful brass section, driving percussion, sweeping strings',
        feel: 'intense, emotionally charged, climactic',
        tempo: '120-140 BPM',
        key: 'C minor'
      },
      peaceful: {
        genre: 'ambient cinematic',
        instruments: 'soft piano, warm string pads, ethereal synth textures',
        feel: 'serene, calming, tranquil atmosphere',
        tempo: '60-80 BPM',
        key: 'C major'
      },
      happy: {
        genre: 'uplifting orchestral',
        instruments: 'bright piano, playful woodwinds, light strings, gentle percussion',
        feel: 'joyful, optimistic, heartwarming',
        tempo: '110-130 BPM',
        key: 'G major'
      },
      sad: {
        genre: 'melancholic cinematic',
        instruments: 'solo cello, soft piano, minimal strings',
        feel: 'somber, reflective, emotionally vulnerable',
        tempo: '65-85 BPM',
        key: 'A minor'
      },
      mysterious: {
        genre: 'dark atmospheric',
        instruments: 'low drones, sparse piano, subtle electronic elements',
        feel: 'eerie, enigmatic, unsettling ambiance',
        tempo: '75-95 BPM',
        key: 'E minor'
      }
    };

    // Get mood-specific musical elements
    const moodKey = analysis.dominantMood.toLowerCase();
    const musicElements = moodMap[moodKey] || {
      genre: 'cinematic score',
      instruments: 'orchestral ensemble',
      feel: 'atmospheric, emotional',
      tempo: '90-110 BPM',
      key: 'A minor'
    };

    // Adjust for lighting - adds tonal quality
    let lightingModifier = '';
    if (analysis.dominantLighting.toLowerCase().includes('dark') || analysis.dominantLighting.toLowerCase().includes('dim')) {
      lightingModifier = ' with darker, brooding tones';
    } else if (analysis.dominantLighting.toLowerCase().includes('bright') || analysis.dominantLighting.toLowerCase().includes('golden')) {
      lightingModifier = ' with warm, luminous quality';
    }

    // Adjust for shot type - affects arrangement density
    let arrangementNote = '';
    if (analysis.dominantShotType.toLowerCase().includes('close') || analysis.dominantShotType.toLowerCase().includes('intimate')) {
      arrangementNote = ' Intimate, focused arrangement.';
    } else if (analysis.dominantShotType.toLowerCase().includes('wide') || analysis.dominantShotType.toLowerCase().includes('epic')) {
      arrangementNote = ' Expansive, full arrangement.';
    }

    // Build comprehensive prompt following ElevenLabs best practices
    return `${musicElements.genre} at ${musicElements.tempo}. ${musicElements.instruments}. ${musicElements.feel}${lightingModifier}.${arrangementNote} Cinematic production quality. Key: ${musicElements.key}.`;
  };

  return (
    <div className="bg-black/30 border border-white/20 rounded-lg p-4 space-y-4">
      {/* Scene Header */}
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-white font-semibold text-lg">Scene Analysis: {sceneName}</h3>
      </div>

      {/* Visual Analysis Summary */}
      <div className="space-y-3">
        <h4 className="text-white/90 font-medium">Visual Analysis Summary</h4>

        {!isEditingAnalysis ? (
          <div className="bg-black/40 rounded p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-white/60">Frames Analyzed:</span>
                <span className="text-white ml-2">{detailedAnalysis.framesAnalyzed}</span>
              </div>
              <div>
                <span className="text-white/60">Duration:</span>
                <span className="text-white ml-2">{detailedAnalysis.sceneDuration.toFixed(1)}s</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div>
                <span className="text-white/60">Dominant Mood:</span>
                <span className="text-white ml-2 capitalize">{editedAnalysis.dominantMood}</span>
              </div>
              <div>
                <span className="text-white/60">Lighting:</span>
                <span className="text-white ml-2 capitalize">{editedAnalysis.dominantLighting}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-white/60">Shot Type:</span>
                <span className="text-white ml-2 capitalize">{editedAnalysis.dominantShotType}</span>
              </div>
              <div>
                <span className="text-white/60">Dominant Color:</span>
                <span className="text-white ml-2 capitalize">{editedAnalysis.dominantColor}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black/40 rounded p-3 space-y-3 text-sm">
            <div className="space-y-2">
              <label className="text-white/80 text-xs">Dominant Mood</label>
              <input
                type="text"
                value={editedAnalysis.dominantMood}
                onChange={(e) => handleAnalysisChange('dominantMood', e.target.value)}
                className="w-full bg-black/50 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange"
                placeholder="e.g., peaceful, dramatic, tense"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-white/80 text-xs">Lighting</label>
                <input
                  type="text"
                  value={editedAnalysis.dominantLighting}
                  onChange={(e) => handleAnalysisChange('dominantLighting', e.target.value)}
                  className="w-full bg-black/50 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange"
                  placeholder="e.g., bright, dim, golden hour"
                />
              </div>
              <div className="space-y-2">
                <label className="text-white/80 text-xs">Shot Type</label>
                <input
                  type="text"
                  value={editedAnalysis.dominantShotType}
                  onChange={(e) => handleAnalysisChange('dominantShotType', e.target.value)}
                  className="w-full bg-black/50 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange"
                  placeholder="e.g., close-up, wide shot"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveAnalysis}
                className="flex-1 px-4 py-2 bg-white/10 text-white border border-white/20 rounded hover:bg-white/20 transition-colors"
              >
                Save & Regenerate Prompt
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Raw Analysis (collapsible) */}
        {rawAnalyses && rawAnalyses.length > 0 && (
          <details className="bg-gradient-to-r from-orange/10 to-orange-dark/10 border border-orange/30 rounded p-3">
            <summary className="text-orange cursor-pointer hover:text-orange/80 font-medium">
              View Full Analysis
            </summary>
            <div className="mt-3 space-y-3 text-xs">
              {rawAnalyses.map((analysis, idx) => (
                <div key={idx} className="bg-black/40 rounded p-3 border-l-4 border-orange/50">
                  <div className="text-orange font-semibold mb-2">
                    Frame {idx + 1} (at {analysis.timestamp.toFixed(1)}s)
                  </div>
                  <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                    {analysis.raw}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Frame-by-frame details (collapsible) */}
        <details className="bg-black/40 rounded p-3">
          <summary className="text-white/80 cursor-pointer hover:text-white">
            View Frame-by-Frame Summary
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {detailedAnalysis.frameByFrameAnalysis.map((frame) => (
              <div key={frame.frame} className="border-l-2 border-white/20 pl-3 text-white/70">
                <span className="text-white/90">Frame {frame.frame}</span> ({frame.timestamp}s) -
                {' '}{frame.lighting} lighting, {frame.shot_type}, {frame.mood} mood, {frame.camera_angle}
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Generated Music Prompt */}
      <div className="space-y-3">
        <h4 className="text-white/90 font-medium">Generated Music Prompt</h4>
        <div className="bg-gradient-to-r from-orange/20 to-orange/10 border border-orange/30 rounded p-3">
          <p className="text-white italic">"{currentPrompt}"</p>
        </div>
      </div>

      {/* User Action Buttons */}
      {!isEditingAnalysis && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex gap-3">
            <button
              onClick={handleGenerateMusic}
              className="flex-1 px-4 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              Generate Music
            </button>
            <button
              onClick={handleEditAnalysis}
              className="flex-1 px-4 py-3 bg-orange/20 text-orange border border-orange/30 rounded-lg hover:bg-orange/30 transition-colors font-medium"
            >
              Edit Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
