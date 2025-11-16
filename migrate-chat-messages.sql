-- Add scene_id column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;

-- Create index for faster lookups by scene_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_scene_id ON chat_messages(scene_id);
