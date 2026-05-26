/*
  # Extend course_certificates for MyDesignNexus template

  1. Modified Tables
    - `course_certificates`
      - `department` (text) - Department of internship
      - `internship_from` (date) - Start date
      - `internship_to` (date) - End date
      - `growth_area` (text) - Professional growth area
      - `instructor_name` (text) - Instructor who supervised
      - `student_name` (text) - Snapshot of student name at issue time
      - `course_title` (text) - Snapshot of course title
      - `course_category` (text) - Snapshot of course category
      - `serial_number` (text) - Pretty format: MDN-INT-YYYY-XXXXXX
      - `share_slug` (text) - URL-safe slug for public sharing at /c/:slug
      - `share_view_count` (integer) - Public view counter

  2. New Functions
    - `generate_certificate_serial()` - Generates MDN-INT-YYYY-XXXXXX serial
    - `generate_certificate_share_slug()` - Generates 10-char URL slug
    - `populate_certificate_serial_slug()` - Trigger to auto-fill on insert
    - `increment_certificate_view(slug)` - Increments view count for public page

  3. Security
    - Public read policy for certificate lookup by slug (for sharing)
    - Public read policy for the certificate template image in storage
    - View count increment granted to anon and authenticated

  4. Notes
    - Existing certificate rows are backfilled with serial numbers and slugs
    - Snapshots are stored at issue time so certificates remain valid
      even if the underlying course/user is later renamed or deleted
*/

-- 1. Add columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'department') THEN
    ALTER TABLE course_certificates ADD COLUMN department text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'internship_from') THEN
    ALTER TABLE course_certificates ADD COLUMN internship_from date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'internship_to') THEN
    ALTER TABLE course_certificates ADD COLUMN internship_to date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'growth_area') THEN
    ALTER TABLE course_certificates ADD COLUMN growth_area text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'instructor_name') THEN
    ALTER TABLE course_certificates ADD COLUMN instructor_name text NOT NULL DEFAULT 'Rakshith';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'student_name') THEN
    ALTER TABLE course_certificates ADD COLUMN student_name text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'course_title') THEN
    ALTER TABLE course_certificates ADD COLUMN course_title text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'course_category') THEN
    ALTER TABLE course_certificates ADD COLUMN course_category text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'serial_number') THEN
    ALTER TABLE course_certificates ADD COLUMN serial_number text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'share_slug') THEN
    ALTER TABLE course_certificates ADD COLUMN share_slug text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_certificates' AND column_name = 'share_view_count') THEN
    ALTER TABLE course_certificates ADD COLUMN share_view_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Unique slug constraint
CREATE UNIQUE INDEX IF NOT EXISTS course_certificates_share_slug_idx
  ON course_certificates(share_slug) WHERE share_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS course_certificates_serial_idx
  ON course_certificates(serial_number);

-- 2. Function to generate a pretty serial number
CREATE OR REPLACE FUNCTION generate_certificate_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part   text := to_char(now(), 'YYYY');
  random_part text;
BEGIN
  random_part := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  RETURN 'MDN-INT-' || year_part || '-' || random_part;
END;
$$;

-- 3. Function to generate a URL-safe share slug
CREATE OR REPLACE FUNCTION generate_certificate_share_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  tries     integer := 0;
BEGIN
  LOOP
    candidate := lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM course_certificates WHERE share_slug = candidate);
    tries := tries + 1;
    IF tries > 5 THEN
      candidate := candidate || tries::text;
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 4. Trigger to auto-populate serial + slug on insert
CREATE OR REPLACE FUNCTION populate_certificate_serial_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
    NEW.serial_number := generate_certificate_serial();
  END IF;
  IF NEW.share_slug IS NULL OR NEW.share_slug = '' THEN
    NEW.share_slug := generate_certificate_share_slug();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_certificates_serial_slug ON course_certificates;
CREATE TRIGGER course_certificates_serial_slug
  BEFORE INSERT ON course_certificates
  FOR EACH ROW EXECUTE FUNCTION populate_certificate_serial_slug();

-- 5. Backfill serial + slug for any existing rows
UPDATE course_certificates
SET serial_number = generate_certificate_serial()
WHERE serial_number = '' OR serial_number IS NULL;

UPDATE course_certificates
SET share_slug = generate_certificate_share_slug()
WHERE share_slug IS NULL OR share_slug = '';

-- 6. PUBLIC read policy for share-slug lookup
DROP POLICY IF EXISTS "Public can view certificate by slug" ON course_certificates;
CREATE POLICY "Public can view certificate by slug"
  ON course_certificates FOR SELECT
  TO anon, authenticated
  USING (share_slug IS NOT NULL);

-- 7. View-count increment function
CREATE OR REPLACE FUNCTION increment_certificate_view(slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE course_certificates
  SET share_view_count = share_view_count + 1
  WHERE share_slug = slug;
$$;

GRANT EXECUTE ON FUNCTION increment_certificate_view(text) TO anon, authenticated;

-- 8. Public storage policy for the template image
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read for certificate template'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read for certificate template"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'prompt-media'
        AND name = 'templates/certificates/mdn-internship-template.jpg'
      );
  END IF;
END $$;
