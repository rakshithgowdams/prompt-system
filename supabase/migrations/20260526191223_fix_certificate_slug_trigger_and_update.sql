/*
  # Fix certificate share_slug always being populated

  ## Problem
  The trigger `course_certificates_serial_slug` only fires on INSERT.
  If a certificate row is created through any path that bypasses the trigger,
  or if the trigger didn't exist at insert time, `share_slug` could be NULL.
  Additionally, the `useIssueCertificate` UPDATE path never regenerates a missing slug.

  ## Changes
  1. Make the trigger fire on BOTH INSERT and UPDATE so slugs are always set.
  2. Backfill any existing rows that might have NULL share_slug or serial_number.
  3. Add NOT NULL DEFAULT constraint guidance (via trigger coverage).
*/

-- 1. Drop existing INSERT-only trigger
DROP TRIGGER IF EXISTS course_certificates_serial_slug ON course_certificates;

-- 2. Re-create trigger to fire on INSERT OR UPDATE
CREATE TRIGGER course_certificates_serial_slug
  BEFORE INSERT OR UPDATE ON course_certificates
  FOR EACH ROW
  EXECUTE FUNCTION populate_certificate_serial_slug();

-- 3. Backfill any rows with missing share_slug or serial_number
UPDATE course_certificates
SET
  serial_number = generate_certificate_serial(),
  share_slug    = generate_certificate_share_slug()
WHERE serial_number IS NULL OR serial_number = ''
   OR share_slug    IS NULL OR share_slug    = '';
