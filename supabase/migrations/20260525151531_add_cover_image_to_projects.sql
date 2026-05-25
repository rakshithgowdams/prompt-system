/*
  # Add cover_image to projects

  ## Changes
  - `projects` table: adds `cover_image` column (nullable text, stores storage path)

  ## Notes
  - Nullable so existing projects are unaffected
  - No RLS changes needed — existing policies cover all columns on the row
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE projects ADD COLUMN cover_image text DEFAULT NULL;
  END IF;
END $$;
