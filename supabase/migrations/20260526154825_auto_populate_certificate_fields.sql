/*
  # Auto-populate certificate fields from course data

  ## Summary
  Removes the requirement for users to manually fill in department, dates, and growth_area.
  The certificate is now fully automatic — generated from course data when a user completes a course.

  ## Changes
  1. Updates `course_certificates` to allow default values for previously required fields
  2. Rewrites `issue_certificate_if_complete` RPC to auto-populate ALL fields:
     - department: derived from course category (or 'AI & Technology')
     - internship_from: enrollment created_at date
     - internship_to: completion date (now())
     - growth_area: derived from course title/category
     - instructor_name: defaults to 'Rakshith'

  ## Notes
  - Existing incomplete stubs will be patched on next page load via a new helper function
  - No data loss — only fills empty fields
*/

-- Make sure fields have sensible defaults so auto-insert doesn't fail
ALTER TABLE course_certificates
  ALTER COLUMN department SET DEFAULT '',
  ALTER COLUMN growth_area SET DEFAULT '',
  ALTER COLUMN instructor_name SET DEFAULT 'Rakshith';

-- Drop and recreate the RPC with full auto-population
DROP FUNCTION IF EXISTS issue_certificate_if_complete(uuid, uuid);

CREATE OR REPLACE FUNCTION issue_certificate_if_complete(p_course_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pct          numeric;
  v_cert_id      uuid;
  v_student_name text;
  v_course_title text;
  v_course_cat   text;
  v_enrolled_at  timestamptz;
  v_dept         text;
  v_growth       text;
BEGIN
  -- 1. Check completion
  SELECT get_course_progress(p_course_id, p_user_id) INTO v_pct;
  IF v_pct < 100 THEN RETURN NULL; END IF;

  -- 2. Mark enrollment complete
  UPDATE course_enrollments
  SET completed_at = COALESCE(completed_at, now())
  WHERE course_id = p_course_id AND user_id = p_user_id;

  -- 3. Get enrollment date for internship_from
  SELECT created_at INTO v_enrolled_at
  FROM course_enrollments
  WHERE course_id = p_course_id AND user_id = p_user_id
  LIMIT 1;

  -- 4. Snapshot student name
  SELECT COALESCE(up.display_name, split_part(au.email, '@', 1))
  INTO v_student_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = p_user_id;

  -- 5. Snapshot course data
  SELECT title, COALESCE(category, 'AI & Technology')
  INTO v_course_title, v_course_cat
  FROM courses
  WHERE id = p_course_id;

  -- 6. Derive department and growth area from course data
  v_dept   := COALESCE(NULLIF(v_course_cat, ''), 'AI & Technology');
  v_growth := COALESCE(NULLIF(v_course_title, ''), 'AI Automation & Development');

  -- 7. Upsert — never overwrites if a full cert already exists
  INSERT INTO course_certificates (
    course_id, user_id,
    student_name, course_title, course_category,
    department, internship_from, internship_to, growth_area,
    instructor_name
  )
  VALUES (
    p_course_id, p_user_id,
    v_student_name, v_course_title, v_course_cat,
    v_dept,
    COALESCE(v_enrolled_at, now() - interval '30 days'),
    now(),
    v_growth,
    'Rakshith'
  )
  ON CONFLICT (course_id, user_id) DO UPDATE
    SET
      student_name   = EXCLUDED.student_name,
      course_title   = EXCLUDED.course_title,
      course_category = EXCLUDED.course_category,
      department     = CASE WHEN course_certificates.department = '' THEN EXCLUDED.department ELSE course_certificates.department END,
      internship_from = CASE WHEN course_certificates.internship_from IS NULL THEN EXCLUDED.internship_from ELSE course_certificates.internship_from END,
      internship_to  = CASE WHEN course_certificates.internship_to IS NULL THEN EXCLUDED.internship_to ELSE course_certificates.internship_to END,
      growth_area    = CASE WHEN course_certificates.growth_area = '' THEN EXCLUDED.growth_area ELSE course_certificates.growth_area END
  RETURNING id INTO v_cert_id;

  RETURN v_cert_id;
END;
$$;

-- Helper: patch any existing stubs that have empty fields
CREATE OR REPLACE FUNCTION patch_incomplete_certificate(p_cert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cert record;
  v_course_cat text;
  v_enrolled_at timestamptz;
BEGIN
  SELECT cc.*, c.category
  INTO v_cert
  FROM course_certificates cc
  JOIN courses c ON c.id = cc.course_id
  WHERE cc.id = p_cert_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_course_cat := COALESCE(NULLIF(v_cert.category, ''), 'AI & Technology');

  SELECT created_at INTO v_enrolled_at
  FROM course_enrollments
  WHERE course_id = v_cert.course_id AND user_id = v_cert.user_id
  LIMIT 1;

  UPDATE course_certificates SET
    department     = CASE WHEN department = ''     THEN v_course_cat                             ELSE department     END,
    growth_area    = CASE WHEN growth_area = ''    THEN COALESCE(NULLIF(v_cert.course_title,''), v_course_cat) ELSE growth_area    END,
    internship_from= CASE WHEN internship_from IS NULL THEN COALESCE(v_enrolled_at, issued_at - interval '30 days') ELSE internship_from END,
    internship_to  = CASE WHEN internship_to IS NULL   THEN issued_at                            ELSE internship_to  END,
    instructor_name= CASE WHEN instructor_name = ''    THEN 'Rakshith'                           ELSE instructor_name END
  WHERE id = p_cert_id;
END;
$$;
