/*
  # Fix issue_certificate_if_complete: use enrolled_at and backfill missing certs

  ## Problem
  The RPC was referencing `created_at` on `course_enrollments` but that column
  does not exist — the actual column is `enrolled_at`. This caused the RPC to
  throw a column-not-found error for every student except the very first one
  (whose cert was issued before this bug was introduced), so no new certificates
  were being generated.

  ## Changes
  1. Rewrites `issue_certificate_if_complete` to use `enrolled_at`
  2. Also fixes `patch_incomplete_certificate` for the same reason
  3. Backfills certificates for all students who completed all lessons but have no cert
*/

-- 1. Fix the main certificate issuance RPC
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
  -- 1. Check completion — must be 100%
  SELECT get_course_progress(p_course_id, p_user_id) INTO v_pct;
  IF v_pct < 100 THEN RETURN NULL; END IF;

  -- 2. Mark enrollment complete
  UPDATE course_enrollments
  SET completed_at = COALESCE(completed_at, now())
  WHERE course_id = p_course_id AND user_id = p_user_id;

  -- 3. Get enrollment date (correct column: enrolled_at)
  SELECT enrolled_at INTO v_enrolled_at
  FROM course_enrollments
  WHERE course_id = p_course_id AND user_id = p_user_id
  LIMIT 1;

  -- 4. Snapshot student name
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

  -- 8. Always fetch the id reliably
  SELECT id INTO v_cert_id
  FROM course_certificates
  WHERE course_id = p_course_id AND user_id = p_user_id;

  RETURN v_cert_id;
END;
$$;

-- 2. Fix patch_incomplete_certificate to also use enrolled_at
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

  SELECT enrolled_at INTO v_enrolled_at
  FROM course_enrollments
  WHERE course_id = v_cert.course_id AND user_id = v_cert.user_id
  LIMIT 1;

  UPDATE course_certificates SET
    department      = CASE WHEN department      = '' THEN v_course_cat                                             ELSE department      END,
    growth_area     = CASE WHEN growth_area     = '' THEN COALESCE(NULLIF(v_cert.course_title, ''), v_course_cat) ELSE growth_area     END,
    internship_from = CASE WHEN internship_from IS NULL THEN COALESCE(v_enrolled_at, issued_at - interval '30 days')::date ELSE internship_from END,
    internship_to   = CASE WHEN internship_to   IS NULL THEN issued_at::date                                       ELSE internship_to   END,
    instructor_name = CASE WHEN instructor_name = '' THEN 'Rakshith'                                               ELSE instructor_name END
  WHERE id = p_cert_id;
END;
$$;

-- 3. Backfill certificates for all students who completed all lessons but have no cert
DO $$
DECLARE
  r record;
  v_cert_id uuid;
BEGIN
  FOR r IN
    SELECT ce.user_id, ce.course_id
    FROM course_enrollments ce
    WHERE NOT EXISTS (
      SELECT 1 FROM course_certificates cc
      WHERE cc.course_id = ce.course_id AND cc.user_id = ce.user_id
    )
    AND (
      SELECT COUNT(*) FROM lesson_progress lp
      WHERE lp.course_id = ce.course_id AND lp.user_id = ce.user_id AND lp.completed = true
    ) >= (
      SELECT COUNT(*) FROM course_lessons cl WHERE cl.course_id = ce.course_id
    )
    AND (SELECT COUNT(*) FROM course_lessons cl WHERE cl.course_id = ce.course_id) > 0
  LOOP
    SELECT issue_certificate_if_complete(r.course_id, r.user_id) INTO v_cert_id;
  END LOOP;
END $$;
