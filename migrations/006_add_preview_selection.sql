-- Add preview selection columns to audio_variations and sound_effects

ALTER TABLE audio_variations
ADD COLUMN IF NOT EXISTS selected_for_preview BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selected_for_import BOOLEAN DEFAULT false;

ALTER TABLE sound_effects
ADD COLUMN IF NOT EXISTS selected_for_preview BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selected_for_import BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN audio_variations.selected_for_preview IS 'Whether this track is selected for preview playback';
COMMENT ON COLUMN audio_variations.selected_for_import IS 'Whether this track is selected for final import';
COMMENT ON COLUMN sound_effects.selected_for_preview IS 'Whether this sound effect is selected for preview playback';
COMMENT ON COLUMN sound_effects.selected_for_import IS 'Whether this sound effect is selected for final import';

-- Create preview_tracks table to cache generated preview combinations
CREATE TABLE IF NOT EXISTS preview_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  music_track_id UUID REFERENCES audio_variations(id) ON DELETE CASCADE,
  sound_effect_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_preview_tracks_scene_id ON preview_tracks(scene_id);
CREATE INDEX IF NOT EXISTS idx_preview_tracks_expires ON preview_tracks(expires_at);

COMMENT ON TABLE preview_tracks IS 'Cached preview audio tracks combining music and sound effects';
