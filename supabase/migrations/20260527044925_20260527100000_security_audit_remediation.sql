/*
  # Security Audit Remediation

  ## Summary
  Closes 7 critical/high attack paths identified in the 50-year hacker audit.

  ## Changes

  ### 1. user_profiles — admin flag + vault columns
  - `is_admin` boolean (DEFAULT false) — used to gate certificate asset uploads and email sending
  - `vault_salt` text — random 32-byte base64 salt generated client-side at vault setup
  - `vault_verifier` text — AES-GCM ciphertext used to verify master password without storing it

  ### 2. Share tables — password hash scheme tracking
  - `password_hash_scheme` on `file_shares` and `course_shares`
  - Values: 'sha256_client' (legacy) or 'argon2id' (new)
  - Enables gradual migration: new shares use argon2id, old shares migrate on first correct unlock

  ### 3. course_certificates — drop enumerable public policy, add slug-only RPC
  - DROP the "Public can view certificate by slug" policy that allowed full-table scans
  - CREATE `get_certificate_by_slug(p_slug)` SECURITY DEFINER function — returns ONE row max
  - Owner retains SELECT on their own certs

  ### 4. user_profiles — drop open SELECT, replace with own-only + public view
  - DROP "Authenticated users can read all profiles" policy
  - ADD "Users can read own profile" policy (full columns, own row only)
  - The existing `public_user_profiles` view (from hardening v2) handles cross-user lookups safely

  ### 5. audit_log — strip IP from user-facing reads
  - DROP existing "Users can read own audit log" policy (exposes IP column)
  - ADD admin-only full SELECT policy
  - CREATE `my_audit_log` view — same data minus ip and user_agent columns

  ### Security Notes
  - is_admin defaults false for all new users; founder must be seeded manually
  - vault_salt/vault_verifier are set client-side; server never sees the master password
  - The certificate RPC cannot be used for table enumeration (LIMIT 1, indexed by slug)
*/

-- ─── 1. user_profiles: admin flag + vault columns ────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vault_salt text;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vault_verifier text;

-- ─── 2. Share tables: password hash scheme ───────────────────────────────────

ALTER TABLE file_shares
  ADD COLUMN IF NOT EXISTS password_hash_scheme text NOT NULL DEFAULT 'sha256_client';

ALTER TABLE course_shares
  ADD COLUMN IF NOT EXISTS password_hash_scheme text NOT NULL DEFAULT 'sha256_client';

-- ─── 3. course_certificates: drop enumerable public policy ───────────────────

DROP POLICY IF EXISTS "Public can view certificate by slug" ON course_certificates;

-- Slug-only lookup function — cannot be used to dump the table
CREATE OR REPLACE FUNCTION get_certificate_by_slug(p_slug text)
RETURNS TABLE(
  id uuid,
  course_id uuid,
  user_id uuid,
  certificate_number text,
  issued_at timestamptz,
  department text,
  internship_from date,
  internship_to date,
  growth_area text,
  instructor_name text,
  student_name text,
  course_title text,
  course_category text,
  serial_number text,
  share_slug text,
  share_view_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.course_id, c.user_id,
    c.certificate_number, c.issued_at,
    c.department, c.internship_from, c.internship_to,
    c.growth_area, c.instructor_name, c.student_name,
    c.course_title, c.course_category,
    c.serial_number, c.share_slug, c.share_view_count
  FROM course_certificates c
  WHERE c.share_slug = p_slug
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_certificate_by_slug(text) TO anon, authenticated;

-- ─── 4. user_profiles: lock down cross-user SELECT ───────────────────────────

-- Drop the open policy that lets any authenticated user read all profiles
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;

-- Own profile — full columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own profile"
        ON user_profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = id)
    $pol$;
  END IF;
END $$;

-- Re-grant the public view so cross-user lookups still work for display_name/avatar
GRANT SELECT ON public_user_profiles TO anon, authenticated;

-- ─── 5. audit_log: strip IP from user-facing view ────────────────────────────

-- Drop old policy that exposes IP column to the row owner
DROP POLICY IF EXISTS "Users can read own audit log" ON audit_log;

-- Admin-only full SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log'
      AND policyname = 'Admins can read full audit log'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can read full audit log"
        ON audit_log FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
        )
    $pol$;
  END IF;
END $$;

-- Sanitized view for users — no IP, no user_agent
CREATE OR REPLACE VIEW my_audit_log
WITH (security_invoker = true)
AS
SELECT id, user_id, action, target_type, target_id, metadata, created_at
FROM audit_log
WHERE user_id = auth.uid();

GRANT SELECT ON my_audit_log TO authenticated;
