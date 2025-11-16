-- Add BPM column to audio_variations table
ALTER TABLE audio_variations
ADD COLUMN IF NOT EXISTS bpm INTEGER;

-- Add comment
COMMENT ON COLUMN audio_variations.bpm IS 'Beats per minute for the generated music';
