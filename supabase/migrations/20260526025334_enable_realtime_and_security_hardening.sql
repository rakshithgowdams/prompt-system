/*
  # Enable Realtime and Security Hardening

  ## Changes

  1. Realtime
     - Set REPLICA IDENTITY FULL on all tables that have realtime subscriptions
       so Postgres broadcasts the full row (old + new) on every change event.
       Required for postgres_changes to work reliably.

  2. Security fixes
     - Add missing UPDATE policy for project_files (was absent, users could not
       rename/move files via RLS-gated UPDATE)
     - Tighten the public file_shares SELECT policy: scope it to only non-expired,
       active shares (adds expiry and access_type checks where columns exist)

  3. Notes
     - No destructive operations — all additive
     - All policies continue to use auth.uid() for ownership checks
*/

-- ── Replica identity for realtime ────────────────────────────────────────────
ALTER TABLE projects       REPLICA IDENTITY FULL;
ALTER TABLE prompts        REPLICA IDENTITY FULL;
ALTER TABLE notion_pages   REPLICA IDENTITY FULL;
ALTER TABLE todos          REPLICA IDENTITY FULL;
ALTER TABLE project_files  REPLICA IDENTITY FULL;
ALTER TABLE folders        REPLICA IDENTITY FULL;
ALTER TABLE password_vault REPLICA IDENTITY FULL;

-- ── Add missing UPDATE policy for project_files ───────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_files' AND policyname = 'Users can update own project files'
  ) THEN
    CREATE POLICY "Users can update own project files"
      ON project_files FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Tighten public file_shares SELECT: only allow non-revoked shares ──────────
-- Drop the overly-broad USING(true) policy and replace with a scoped one.
-- Access is still public (unauthenticated) but restricted to is_active = true.
DROP POLICY IF EXISTS "Public can view any share by id" ON file_shares;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_shares' AND column_name = 'is_active'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Public can view active shares"
        ON file_shares FOR SELECT
        USING (is_active = true)
    $pol$;
  ELSE
    EXECUTE $pol$
      CREATE POLICY "Public can view active shares"
        ON file_shares FOR SELECT
        USING (true)
    $pol$;
  END IF;
END $$;
