/*
  # Nested Folders + File Metadata for Production Directory System

  ## Schema Changes
  1. `folders` — add `parent_folder_id` (self-FK with CASCADE) for unlimited nesting,
     add `updated_at`, and unique indexes for duplicate-name prevention at each level.
  2. `project_files` — add `updated_at`, unique indexes for safe renames.

  ## New Policies
  - UPDATE policy on `project_files` so rename/move works via RLS.

  ## Triggers
  - `updated_at` auto-bump on both tables.

  ## New RPCs
  - `delete_folder_recursive(p_folder_id)` — atomically deletes a folder + all descendants
    + all contained files, returns the list of storage paths to clean up client-side.
  - `folder_stats(p_folder_id)` — returns file_count, total_size, folder_count for a folder tree.

  ## Important Notes
  1. Two partial unique indexes handle root-level (parent_folder_id IS NULL) vs nested uniqueness
     because NULL <> NULL in standard SQL uniqueness.
  2. The RPC is SECURITY DEFINER — it verifies the caller owns the folder before deleting.
  3. No data is destroyed by this migration; it only adds columns/indexes/policies/functions.
*/

-- ── 1. Extend folders for nesting ────────────────────────────────────────────
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS parent_folder_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS folders_parent_idx         ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS folders_project_parent_idx ON folders(project_id, parent_folder_id);

-- Uniqueness: no two folders with same name at the same level in the same project
DROP INDEX IF EXISTS folders_unique_name_root_idx;
DROP INDEX IF EXISTS folders_unique_name_nested_idx;

CREATE UNIQUE INDEX folders_unique_name_root_idx
  ON folders (project_id, lower(name))
  WHERE parent_folder_id IS NULL;

CREATE UNIQUE INDEX folders_unique_name_nested_idx
  ON folders (project_id, parent_folder_id, lower(name))
  WHERE parent_folder_id IS NOT NULL;

-- ── 2. Extend project_files ──────────────────────────────────────────────────
ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Unique file names within their containing folder
DROP INDEX IF EXISTS project_files_unique_name_root_idx;
DROP INDEX IF EXISTS project_files_unique_name_folder_idx;

CREATE UNIQUE INDEX project_files_unique_name_root_idx
  ON project_files (project_id, lower(file_name))
  WHERE folder_id IS NULL;

CREATE UNIQUE INDEX project_files_unique_name_folder_idx
  ON project_files (project_id, folder_id, lower(file_name))
  WHERE folder_id IS NOT NULL;

-- ── 3. UPDATE policy on project_files (for rename + move) ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_files'
      AND policyname = 'Users can update own project files'
  ) THEN
    CREATE POLICY "Users can update own project files"
      ON project_files FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- UPDATE policy on folders (for rename + move)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'folders'
      AND policyname = 'Users can update own folders'
  ) THEN
    CREATE POLICY "Users can update own folders"
      ON folders FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. Triggers: bump updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_bump_files_folders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS folders_updated_at ON folders;
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION trg_bump_files_folders_updated_at();

DROP TRIGGER IF EXISTS project_files_updated_at ON project_files;
CREATE TRIGGER project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION trg_bump_files_folders_updated_at();

-- ── 5. RPC: recursive folder delete — returns storage paths to clean up ──────
CREATE OR REPLACE FUNCTION delete_folder_recursive(p_folder_id uuid)
RETURNS TABLE(deleted_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM folders WHERE id = p_folder_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT id FROM folders WHERE id = p_folder_id
    UNION ALL
    SELECT f.id FROM folders f JOIN descendants d ON f.parent_folder_id = d.id
  ),
  deleted_files AS (
    DELETE FROM project_files
    WHERE folder_id IN (SELECT id FROM descendants)
    RETURNING file_path
  ),
  deleted_folders AS (
    DELETE FROM folders WHERE id IN (SELECT id FROM descendants)
    RETURNING id
  )
  SELECT file_path FROM deleted_files;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_folder_recursive(uuid) TO authenticated;

-- ── 6. RPC: folder stats (file count, total size, child folder count) ────────
CREATE OR REPLACE FUNCTION folder_stats(p_folder_id uuid)
RETURNS TABLE(file_count bigint, total_size bigint, folder_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT id FROM folders WHERE id = p_folder_id
    UNION ALL
    SELECT f.id FROM folders f JOIN descendants d ON f.parent_folder_id = d.id
  )
  SELECT
    COALESCE((SELECT COUNT(*)::bigint FROM project_files WHERE folder_id IN (SELECT id FROM descendants)), 0::bigint),
    COALESCE((SELECT SUM(file_size)::bigint FROM project_files WHERE folder_id IN (SELECT id FROM descendants)), 0::bigint),
    COALESCE((SELECT (COUNT(*) - 1)::bigint FROM descendants), 0::bigint);
END;
$$;

GRANT EXECUTE ON FUNCTION folder_stats(uuid) TO authenticated;
