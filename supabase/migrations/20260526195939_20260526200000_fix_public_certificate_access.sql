/*
  # Fix public certificate access on /c/:slug

  ## Problem
  Students sharing certificate links via /c/:slug were getting "Certificate not found"
  for unauthenticated visitors. Three root causes:

  1. Some certificate rows had NULL share_slug because the slug trigger was historically
     INSERT-only. Already fixed in 20260526191223 but defensive backfill applied here.
  2. The anon role lacked an explicit GRANT SELECT on course_certificates — RLS policies
     are row filters on top of grants; missing grant means no rows ever visible to anon.
  3. increment_certificate_view RPC may lack EXECUTE permission for anon.

  ## Changes
  1. GRANT SELECT on course_certificates to anon and authenticated.
  2. GRANT EXECUTE on increment_certificate_view to anon, authenticated.
  3. Replace the public read policy to correctly allow anon SELECT by slug.
  4. Force-backfill any rows still missing share_slug or serial_number.
  5. Re-confirm BEFORE INSERT OR UPDATE trigger (defensive idempotent).
  6. Add/re-assert UNIQUE index on share_slug for fast public lookups.
*/

-- ── 1. Grant base SELECT privilege to anon so RLS policies can filter rows ───
GRANT SELECT ON course_certificates TO anon;
GRANT SELECT ON course_certificates TO authenticated;

-- ── 2. Grant EXECUTE on the view-counter RPC ─────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'increment_certificate_view'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION increment_certificate_view(text) TO anon, authenticated';
  END IF;
END $$;

-- ── 3. Replace public-by-slug policy (clean + re-create) ─────────────────────
DROP POLICY IF EXISTS "Public can view certificate by slug" ON course_certificates;
DROP POLICY IF EXISTS "Public can view certificates" ON course_certificates;
DROP POLICY IF EXISTS "Anon can view shared certificates" ON course_certificates;

CREATE POLICY "Public can view certificate by slug"
  ON course_certificates
  FOR SELECT
  TO anon, authenticated
  USING (share_slug IS NOT NULL);

-- ── 4. Force-backfill rows missing slug or serial ────────────────────────────
UPDATE course_certificates
SET share_slug = generate_certificate_share_slug()
WHERE share_slug IS NULL OR share_slug = '';

UPDATE course_certificates
SET serial_number = generate_certificate_serial()
WHERE serial_number IS NULL OR serial_number = '';

-- ── 5. Re-confirm BEFORE INSERT OR UPDATE trigger exists ─────────────────────
DROP TRIGGER IF EXISTS course_certificates_serial_slug ON course_certificates;

CREATE TRIGGER course_certificates_serial_slug
  BEFORE INSERT OR UPDATE ON course_certificates
  FOR EACH ROW
  EXECUTE FUNCTION populate_certificate_serial_slug();

-- ── 6. Unique index on share_slug for fast /c/:slug lookups ──────────────────
DROP INDEX IF EXISTS course_certificates_share_slug_idx;
CREATE UNIQUE INDEX course_certificates_share_slug_idx
  ON course_certificates(share_slug)
  WHERE share_slug IS NOT NULL;

-- ── 7. Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_null_count integer;
  v_total_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count FROM course_certificates WHERE share_slug IS NULL;
  SELECT COUNT(*) INTO v_total_count FROM course_certificates;
  RAISE NOTICE '[cert-fix] % of % certificates have NULL share_slug after backfill', v_null_count, v_total_count;
END $$;
