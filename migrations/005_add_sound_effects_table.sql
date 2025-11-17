-- Create sound_effects table
CREATE TABLE IF NOT EXISTS sound_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  timestamp_start DECIMAL(10, 3) NOT NULL, -- When the sound effect should start (in seconds)
  duration DECIMAL(10, 3), -- Duration of the sound effect
  prompt TEXT, -- The prompt used to generate this sound effect
  is_recommended BOOLEAN DEFAULT false, -- Was this pre-recommended by analysis?
  is_generated BOOLEAN DEFAULT false, -- Has this been generated yet?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sound_effects_scene_id ON sound_effects(scene_id);
CREATE INDEX IF NOT EXISTS idx_sound_effects_timestamp ON sound_effects(scene_id, timestamp_start);

-- Add comments
COMMENT ON TABLE sound_effects IS 'Sound effects for video scenes';
COMMENT ON COLUMN sound_effects.timestamp_start IS 'Start time of the sound effect in seconds';
COMMENT ON COLUMN sound_effects.is_recommended IS 'Whether this was recommended by AI analysis';
COMMENT ON COLUMN sound_effects.is_generated IS 'Whether the sound effect file has been generated';
