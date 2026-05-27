/*
  # Close spam vectors on notify_signups and bug_reports

  ## Problem
  Both tables accept unlimited anonymous INSERT directly via RLS WITH CHECK (true).
  An attacker can flood them with 100K rows/minute at zero cost.

  ## Fix
  - Revoke all direct anon INSERT policies on both tables
  - Service role (used by edge functions) bypasses RLS — edge functions become
    the only insertion gateway, enforcing rate limiting + CAPTCHA verification
  - Authenticated users keep SELECT on their own rows
  - Admin users (is_admin = true) can read all rows for triage

  ## Notes
  - Existing data is not touched
  - The edge functions submit-notify-signup and submit-bug-report are deployed separately
*/

-- ── 1. notify_signups: revoke open anon INSERT ─────────────────────────────

DROP POLICY IF EXISTS "Anyone can insert a notify signup" ON notify_signups;

-- Keep owner read (if the table has a user_id FK)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notify_signups' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'notify_signups' AND policyname = 'Owner can read own signups'
    ) THEN
      EXECUTE 'CREATE POLICY "Owner can read own signups"
        ON notify_signups FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- Admin read-all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notify_signups' AND policyname = 'Admins can read all notify signups'
  ) THEN
    CREATE POLICY "Admins can read all notify signups"
      ON notify_signups FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
      ));
  END IF;
END $$;

-- ── 2. bug_reports: revoke open anon INSERT ────────────────────────────────

DROP POLICY IF EXISTS "Anyone can submit a bug report" ON bug_reports;
DROP POLICY IF EXISTS "Anonymous users can submit bug reports" ON bug_reports;

-- Admin read-all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bug_reports' AND policyname = 'Admins can read all bug reports'
  ) THEN
    CREATE POLICY "Admins can read all bug reports"
      ON bug_reports FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
      ));
  END IF;
END $$;
