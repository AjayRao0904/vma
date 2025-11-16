-- Aalap VMA Database Schema
-- PostgreSQL Schema for Video Music Application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth user data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    google_id VARCHAR(255) UNIQUE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scene analysis table (visual analysis from LLaVA)
CREATE TABLE IF NOT EXISTS scene_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    frame_timestamp DECIMAL(10, 2) NOT NULL, -- Time in scene (e.g., 5.0, 10.0, 15.0)
    lighting TEXT, -- e.g., "bright", "dim", "golden hour"
    camera_angle TEXT, -- e.g., "low angle", "high angle", "eye level"
    colors JSONB, -- e.g., {"red": 0.3, "blue": 0.5}
    shot_type TEXT, -- e.g., "close-up", "wide shot", "pan"
    mood TEXT, -- e.g., "tense", "peaceful", "dramatic"
    emotions TEXT, -- e.g., "happy", "sad", "angry"
    raw_analysis TEXT, -- Full response from LLaVA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Music prompts table (generated from scene analysis)
CREATE TABLE IF NOT EXISTS music_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL, -- Combined prompt for music generation
    analysis_summary TEXT, -- Summary of all frame analyses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_video_id ON scenes(video_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_variations_scene_id ON audio_variations(scene_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_project_id ON voice_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user_id ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_variations_updated_at BEFORE UPDATE ON audio_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_messages_updated_at BEFORE UPDATE ON voice_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
