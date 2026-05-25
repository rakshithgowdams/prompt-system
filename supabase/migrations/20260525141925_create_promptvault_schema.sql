/*
  # PromptVault Database Schema

  ## Overview
  Full schema for the PromptVault prompt management application.

  ## Tables

  ### projects
  - Stores user project containers (two default ones created automatically on signup)
  - `id` - UUID primary key
  - `user_id` - references auth.users
  - `name` - project display name
  - `slug` - URL-safe identifier
  - `icon` - emoji icon string
  - `color` - color theme string
  - `is_default` - whether this is a default (non-deletable) project

  ### prompts
  - Stores individual prompt entries with metadata
  - `id` - UUID primary key
  - `project_id` - references projects
  - `user_id` - references auth.users
  - `title` - prompt title
  - `prompt_text` - the actual prompt content
  - `platform` - AI tool used (Veo 3, Midjourney, etc.)
  - `notes` - optional notes
  - `tags` - array of tag strings
  - `status` - draft/ready/posted/archived
  - `created_at` / `updated_at` - timestamps

  ### media_files
  - Stores file metadata for images/videos attached to prompts
  - `id` - UUID primary key
  - `prompt_id` - references prompts
  - `file_path` - storage bucket path
  - `file_type` - image or video
  - `file_name` - original filename
  - `file_size` - size in bytes
  - `mime_type` - MIME type

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Storage policies restrict access by user ID folder

  ## Triggers
  - `on_auth_user_created` - auto-creates two default projects on signup
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT 'gray',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  platform TEXT NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'posted', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_prompt_id ON media_files(prompt_id);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can select own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- Prompts policies
CREATE POLICY "Users can select own prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Media files policies
CREATE POLICY "Users can select own media"
  ON media_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = media_files.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own media"
  ON media_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = media_files.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own media"
  ON media_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = media_files.prompt_id
      AND prompts.user_id = auth.uid()
    )
  );

-- Auto-update updated_at on prompts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create default projects on user signup
CREATE OR REPLACE FUNCTION create_default_projects()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO projects (user_id, name, slug, icon, color, is_default) VALUES
    (NEW.id, 'aiwithrakshith', 'aiwithrakshith', '🎯', 'blue', true),
    (NEW.id, 'aiwithpanchami', 'aiwithpanchami', '✨', 'purple', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_projects();
