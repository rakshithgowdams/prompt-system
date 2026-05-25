/*
  # Add Project Files and Folders (Google Drive-style)

  ## Overview
  Adds a direct file storage system to projects, independent of prompts.
  Users can upload any file (image, video, audio, document) directly into
  a project and optionally organise them into folders.

  ## New Tables

  ### folders
  - Sub-directories inside a project (one level, like Drive folders)
  - `id` - UUID primary key
  - `project_id` - references projects
  - `user_id` - references auth.users
  - `name` - folder display name
  - `created_at` - timestamp

  ### project_files
  - Files attached directly to a project (or inside a folder)
  - `id` - UUID primary key
  - `project_id` - references projects
  - `folder_id` - nullable FK to folders (null = root of project)
  - `user_id` - references auth.users
  - `file_path` - storage bucket path
  - `file_name` - original filename
  - `file_type` - image | video | audio | document | other
  - `file_size` - bytes
  - `mime_type` - MIME type string
  - `created_at` - timestamp

  ## Security
  - RLS enabled on both tables
  - Users can only access their own folders and files
*/

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other' CHECK (file_type IN ('image', 'video', 'audio', 'document', 'other')),
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_folder_id ON project_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can select own folders"
  ON folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Project files policies
CREATE POLICY "Users can select own project files"
  ON project_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project files"
  ON project_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project files"
  ON project_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
