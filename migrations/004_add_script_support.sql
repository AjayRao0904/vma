-- Add script support to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS script_content TEXT,
ADD COLUMN IF NOT EXISTS script_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS script_analysis JSONB;

-- Add index for faster script lookups
CREATE INDEX IF NOT EXISTS idx_projects_script ON projects(id) WHERE script_content IS NOT NULL;
