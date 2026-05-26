/*
  # Add is_published to prompts table

  ## Summary
  Adds a boolean `is_published` column to the `prompts` table so users can
  choose to publish their prompts to a public Explore feed, or keep them private.

  ## Changes
  - `prompts` table: new `is_published boolean DEFAULT false NOT NULL`

  ## New RLS Policy
  - Unauthenticated (anon) and authenticated users can SELECT any prompt where
    `is_published = true`. This is the public read policy for the Explore feed.
  - All existing owner-only INSERT / UPDATE / DELETE policies are unchanged.

  ## Notes
  - Default is false — all existing prompts remain private after migration.
  - Media files attached to published prompts are readable via the existing
    signed-URL mechanism; no media-file RLS change is needed for the feed.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE prompts ADD COLUMN is_published boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Public read policy for published prompts
DROP POLICY IF EXISTS "Anyone can view published prompts" ON prompts;
CREATE POLICY "Anyone can view published prompts"
  ON prompts
  FOR SELECT
  USING (is_published = true);
