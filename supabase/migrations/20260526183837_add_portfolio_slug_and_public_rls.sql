/*
  # Portfolio public sharing

  ## Summary
  Enables users to share their full portfolio (profile + certificates) via a
  unique public link of the form /p/<slug>.

  ## Changes

  ### user_profiles
  - Add `portfolio_slug` (text, unique, nullable) — auto-generated on first
    publish; null means the user has never shared.

  ### RLS additions
  - Public SELECT on `user_profiles` where `is_portfolio_public = true`
  - Public SELECT on `course_certificates` for users whose profile is public

  ### Helper function
  - `generate_portfolio_slug(p_user_id uuid)` — generates or returns the
    existing slug for a user, and ensures `is_portfolio_public = true`.
*/

-- 1. Add portfolio_slug column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS portfolio_slug text UNIQUE;

-- 2. Helper: generate (or reuse) a portfolio slug and flip public flag on
CREATE OR REPLACE FUNCTION generate_portfolio_slug(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slug text;
BEGIN
  -- Fetch existing slug
  SELECT portfolio_slug INTO v_slug FROM user_profiles WHERE id = p_user_id;

  IF v_slug IS NULL THEN
    -- Create a short slug: first 8 chars of user_id + 6 random hex chars
    v_slug := substring(replace(p_user_id::text, '-', ''), 1, 8)
              || lower(to_hex(floor(random() * 16777215)::int));
    UPDATE user_profiles
      SET portfolio_slug = v_slug, is_portfolio_public = true
    WHERE id = p_user_id;
  ELSE
    -- Already has a slug — just ensure public is on
    UPDATE user_profiles SET is_portfolio_public = true WHERE id = p_user_id;
  END IF;

  RETURN v_slug;
END;
$$;

-- 3. Public read: profile row is readable when is_portfolio_public = true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Public can view public portfolios'
  ) THEN
    CREATE POLICY "Public can view public portfolios"
      ON user_profiles
      FOR SELECT
      TO anon, authenticated
      USING (is_portfolio_public = true);
  END IF;
END $$;

-- 4. Public read: certificates are readable when the owner's portfolio is public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'course_certificates' AND policyname = 'Public can view certificates of public portfolios'
  ) THEN
    CREATE POLICY "Public can view certificates of public portfolios"
      ON course_certificates
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = course_certificates.user_id
            AND up.is_portfolio_public = true
        )
      );
  END IF;
END $$;
