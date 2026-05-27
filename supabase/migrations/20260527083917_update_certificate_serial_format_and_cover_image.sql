/*
  # Update certificate serial number format and add cover image URL

  ## Summary
  1. Changes serial number format from MDN-INT-YYYY-XXXXXX to MDN-CR-YYYY-XXXXXX
  2. Adds `cover_image_url` column for LinkedIn og:image preview
  3. Backfills existing serials: replaces MDN-INT- with MDN-CR-
  4. Re-creates get_certificate_by_slug RPC with cover_image_url in return type
*/

-- 1. Add cover_image_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_certificates' AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE course_certificates ADD COLUMN cover_image_url text NOT NULL DEFAULT '';
  END IF;
END $$;

-- 2. Update serial generator: MDN-CR-YYYY-XXXXXX
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
  RETURN 'MDN-CR-' || year_part || '-' || random_part;
END;
$$;

-- 3. Backfill existing serials
UPDATE course_certificates
SET serial_number = regexp_replace(serial_number, '^MDN-INT-', 'MDN-CR-')
WHERE serial_number LIKE 'MDN-INT-%';

-- 4. Drop old RPC and recreate with cover_image_url
DROP FUNCTION IF EXISTS get_certificate_by_slug(text);

CREATE FUNCTION get_certificate_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  user_id uuid,
  issued_at timestamptz,
  certificate_number text,
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
  share_view_count integer,
  cover_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM increment_certificate_view(p_slug);

  RETURN QUERY
  SELECT
    c.id, c.course_id, c.user_id,
    c.issued_at, c.certificate_number,
    c.department, c.internship_from, c.internship_to,
    c.growth_area, c.instructor_name, c.student_name,
    c.course_title, c.course_category,
    c.serial_number, c.share_slug, c.share_view_count,
    c.cover_image_url
  FROM course_certificates c
  WHERE c.share_slug = p_slug
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_certificate_by_slug(text) TO anon, authenticated;
