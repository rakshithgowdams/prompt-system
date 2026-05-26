/*
  # Fix issue_certificate_if_complete: RETURNING after ON CONFLICT DO UPDATE

  PostgreSQL's RETURNING clause on INSERT ... ON CONFLICT DO UPDATE can return NULL
  for v_cert_id if the row was matched (not inserted). This migration rewrites the
  upsert to always capture the cert id reliably using a SELECT fallback.

  Also fixes the internship_to date: stores only the date part (not timestamp) to
  match the `date` column type cleanly.
*/

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
  -- 1. Check completion — must be exactly 100%
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

  -- 4. Snapshot student name (prefer display_name, fall back to email prefix)
  SELECT COALESCE(
    NULLIF(trim(up.display_name), ''),
    split_part(au.email, '@', 1)
  )
  INTO v_student_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = p_user_id;

  v_student_name := COALESCE(NULLIF(trim(v_student_name), ''), 'Student');

  -- 5. Snapshot course data
  SELECT title, COALESCE(NULLIF(trim(category), ''), 'AI & Technology')
  INTO v_course_title, v_course_cat
  FROM courses
  WHERE id = p_course_id;

  v_course_title := COALESCE(NULLIF(trim(v_course_title), ''), 'Course Completion');

  -- 6. Derive department and growth area
  v_dept   := v_course_cat;
  v_growth := v_course_title;

  -- 7. Upsert certificate
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
    COALESCE(v_enrolled_at, now() - interval '30 days')::date,
    now()::date,
    v_growth,
    'Rakshith'
  )
  ON CONFLICT (course_id, user_id) DO UPDATE
  SET
    student_name    = EXCLUDED.student_name,
    course_title    = EXCLUDED.course_title,
    course_category = EXCLUDED.course_category,
    department      = CASE WHEN course_certificates.department    = '' THEN EXCLUDED.department    ELSE course_certificates.department    END,
    internship_from = CASE WHEN course_certificates.internship_from IS NULL THEN EXCLUDED.internship_from ELSE course_certificates.internship_from END,
    internship_to   = CASE WHEN course_certificates.internship_to   IS NULL THEN EXCLUDED.internship_to   ELSE course_certificates.internship_to   END,
    growth_area     = CASE WHEN course_certificates.growth_area    = '' THEN EXCLUDED.growth_area    ELSE course_certificates.growth_area    END;

  -- 8. Always fetch the id (RETURNING on ON CONFLICT DO UPDATE can be NULL)
  SELECT id INTO v_cert_id
  FROM course_certificates
  WHERE course_id = p_course_id AND user_id = p_user_id;

  RETURN v_cert_id;
END;
$$;
