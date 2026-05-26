/*
  # Allow public read on media_files for published prompts

  ## Summary
  Adds a SELECT policy so anyone (anon + authenticated) can read media_files
  that belong to a prompt marked is_published = true. This is required for the
  Explore feed to display images and video thumbnails without authentication.

  ## Changes
  - media_files: new SELECT policy "Anyone can view media for published prompts"

  ## Security
  - Only exposes rows where the parent prompt has is_published = true
  - No other tables or columns are affected
*/

DROP POLICY IF EXISTS "Anyone can view media for published prompts" ON media_files;
CREATE POLICY "Anyone can view media for published prompts"
  ON media_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = media_files.prompt_id
        AND prompts.is_published = true
    )
  );
