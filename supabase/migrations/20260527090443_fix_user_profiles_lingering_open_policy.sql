/*
  # Drop lingering user_profiles open SELECT policy

  The migration 20260526060201 created:
    "Authenticated users can read all profiles" ... USING (true)

  The hardening migration 20260527044925 tried to drop it under two wrong names
  ("view" instead of "read"). The original "read all profiles" policy was never
  actually dropped, so every authenticated user can still harvest the full user list.

  This migration drops all variants by name, confirms the locked-down per-user
  policy exists, and ensures the public portfolio policy exists for /p/:slug pages.
*/

-- Drop by exact original name
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;

-- Defensive: drop any alias that might exist
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "authenticated read all profiles" ON user_profiles;

-- Ensure the locked-down per-user SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname = 'Users can read own profile'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON user_profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Ensure the public portfolio policy still exists (needed for /p/:slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname = 'Public can view public portfolios'
  ) THEN
    CREATE POLICY "Public can view public portfolios"
      ON user_profiles FOR SELECT
      TO anon, authenticated
      USING (is_portfolio_public = true);
  END IF;
END $$;

-- Audit: how many USING(true) SELECT policies remain on user_profiles (should be 0)
DO $$
DECLARE
  v_open_count integer;
BEGIN
  SELECT COUNT(*) INTO v_open_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
    AND cmd = 'SELECT'
    AND qual = 'true';
  RAISE NOTICE '[user_profiles_fix] Open USING(true) SELECT policies remaining: %', v_open_count;
END $$;
