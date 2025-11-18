-- Aalap VMA Database Schema
-- PostgreSQL Schema for Video Music Application
-- This is the COMPLETE current schema including all migrations
-- For new databases, run this file
-- For existing databases, run migrations in migrations/ folder sequentially

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth user data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'motion-pictures',
    status VARCHAR(50) DEFAULT 'draft',
    project_mode VARCHAR(20) DEFAULT NULL,
    script_content TEXT,
    script_file_name VARCHAR(255),
    script_file_path TEXT,
    script_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration DECIMAL(10, 2),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenes table (trimmed video segments)
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_time DECIMAL(10, 2) NOT NULL,
    end_time DECIMAL(10, 2) NOT NULL,
    file_path TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audio variations table
CREATE TABLE IF NOT EXISTS audio_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path TEXT,
    duration DECIMAL(10, 2),
    is_playing BOOLEAN DEFAULT false,
    prompt TEXT,
    bpm INTEGER,
    selected_for_preview BOOLEAN DEFAULT false,
    selected_for_import BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sound effects table
CREATE TABLE IF NOT EXISTS sound_effects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    timestamp_start DECIMAL(10, 3) NOT NULL,
    duration DECIMAL(10, 3),
    prompt TEXT,
    is_recommended BOOLEAN DEFAULT false,
    is_generated BOOLEAN DEFAULT false,
    selected_for_preview BOOLEAN DEFAULT false,
    selected_for_import BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preview tracks table (cached preview combinations)
CREATE TABLE IF NOT EXISTS preview_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    music_track_id UUID REFERENCES audio_variations(id) ON DELETE CASCADE,
    sound_effect_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

-- Voice messages table
CREATE TABLE IF NOT EXISTS voice_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_blob BYTEA,
    duration DECIMAL(10, 2),
    transcription TEXT,
    waveform_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table (per-scene chat history)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scene analysis table (visual analysis from LLaVA)
CREATE TABLE IF NOT EXISTS scene_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    frame_timestamp DECIMAL(10, 2) NOT NULL,
    lighting TEXT,
    camera_angle TEXT,
    colors JSONB,
    shot_type TEXT,
    mood TEXT,
    emotions TEXT,
    raw_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Music prompts table (generated from scene analysis)
CREATE TABLE IF NOT EXISTS music_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    analysis_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_script ON projects(id) WHERE script_content IS NOT NULL;

-- Videos
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);

-- Scenes
CREATE INDEX IF NOT EXISTS idx_scenes_video_id ON scenes(video_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);

-- Audio variations
CREATE INDEX IF NOT EXISTS idx_audio_variations_scene_id ON audio_variations(scene_id);

-- Sound effects
CREATE INDEX IF NOT EXISTS idx_sound_effects_scene_id ON sound_effects(scene_id);
CREATE INDEX IF NOT EXISTS idx_sound_effects_timestamp ON sound_effects(scene_id, timestamp_start);

-- Preview tracks
CREATE INDEX IF NOT EXISTS idx_preview_tracks_scene_id ON preview_tracks(scene_id);
CREATE INDEX IF NOT EXISTS idx_preview_tracks_expires ON preview_tracks(expires_at);

-- Voice messages
CREATE INDEX IF NOT EXISTS idx_voice_messages_project_id ON voice_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user_id ON voice_messages(user_id);

-- Chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_scene_id ON chat_messages(scene_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenes_updated_at ON scenes;
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audio_variations_updated_at ON audio_variations;
CREATE TRIGGER update_audio_variations_updated_at BEFORE UPDATE ON audio_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_messages_updated_at ON voice_messages;
CREATE TRIGGER update_voice_messages_updated_at BEFORE UPDATE ON voice_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with OAuth and password authentication';
COMMENT ON TABLE projects IS 'Video projects with workflow mode selection';
COMMENT ON TABLE videos IS 'Uploaded video files';
COMMENT ON TABLE scenes IS 'Trimmed video segments for analysis';
COMMENT ON TABLE audio_variations IS 'Generated music tracks for scenes';
COMMENT ON TABLE sound_effects IS 'AI-generated or recommended sound effects';
COMMENT ON TABLE preview_tracks IS 'Cached preview audio tracks combining music and sound effects';
COMMENT ON TABLE voice_messages IS 'Voice input recordings from users';
COMMENT ON TABLE chat_messages IS 'Chat history for AI conversations per scene/project';
COMMENT ON TABLE scene_analysis IS 'Visual analysis results from AI vision models';
COMMENT ON TABLE music_prompts IS 'Generated prompts for music creation';

COMMENT ON COLUMN projects.project_mode IS 'Workflow mode: "entire" for single score, "scenes" for scene-based workflow';
COMMENT ON COLUMN audio_variations.bpm IS 'Beats per minute for the generated music';
COMMENT ON COLUMN audio_variations.selected_for_preview IS 'Whether this track is selected for preview playback';
COMMENT ON COLUMN audio_variations.selected_for_import IS 'Whether this track is selected for final import';
COMMENT ON COLUMN sound_effects.timestamp_start IS 'Start time of the sound effect in seconds';
COMMENT ON COLUMN sound_effects.is_recommended IS 'Whether this was recommended by AI analysis';
COMMENT ON COLUMN sound_effects.is_generated IS 'Whether the sound effect file has been generated';
COMMENT ON COLUMN sound_effects.selected_for_preview IS 'Whether this sound effect is selected for preview playback';
COMMENT ON COLUMN sound_effects.selected_for_import IS 'Whether this sound effect is selected for final import';
