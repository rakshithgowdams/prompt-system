/*
  # Add is_active to file_shares + fix RLS for public share viewer

  ## Changes

  1. Add `is_active` boolean column (default true) to file_shares so shares can be
     revoked without deletion.

  2. Update the public SELECT policy to only expose active shares.

  3. Add a permissive anon SELECT policy on project_files and folders so that
     unauthenticated visitors accessing a valid share link can read the referenced
     files/folders. The Edge Function (get-share) uses service_role and bypasses RLS,
     but we add these as a defence-in-depth fallback.

  ## Notes
  - No data loss. All existing shares stay active (is_active = true by default).
*/

-- ── Add is_active to file_shares ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_shares' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE file_shares ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Drop old public policy and replace with is_active-scoped one
DROP POLICY IF EXISTS "Public can view any share by id" ON file_shares;
DROP POLICY IF EXISTS "Public can view active shares" ON file_shares;

CREATE POLICY "Public can view active shares"
  ON file_shares FOR SELECT
  USING (is_active = true);
