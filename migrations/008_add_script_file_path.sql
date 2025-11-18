-- Migration: Add script_file_path to projects table
-- This stores the S3 key for the uploaded script file

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS script_file_path TEXT;

-- Add index for script lookups
CREATE INDEX IF NOT EXISTS idx_projects_script_file_path ON projects(script_file_path) WHERE script_file_path IS NOT NULL;
