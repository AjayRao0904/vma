-- Migration: Add project_mode to projects, remove thumbnails table
-- Phase 1 refactor: Store workflow selection and remove thumbnail dependency

-- Add project_mode column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_mode VARCHAR(20) DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN projects.project_mode IS 'Workflow mode: "entire" for single score, "scenes" for scene-based workflow';

-- Drop thumbnails table (no longer needed in Phase 1)
DROP TABLE IF EXISTS thumbnails CASCADE;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger exists for projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
