/*
  # Fix certificate issuance flow

  1. Problems fixed
    - issue_certificate_if_complete only created a stub with no student_name, course_title etc.
    - No UPDATE RLS policy existed so UPSERT from the client was blocked
    - Stubs blocked the manual issuance form from working (UNIQUE constraint)

  2. Changes
    - Replace issue_certificate_if_complete: now fills student_name and course_title from DB,
      uses ON CONFLICT DO UPDATE to patch an existing stub with those snapshot fields
    - Add UPDATE policy so authenticated users can update their own certificates
*/

-- Fix the RPC to populate snapshot fields and patch stubs on conflict
CREATE OR REPLACE FUNCTION issue_certificate_if_complete(p_course_id uuid, p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  progress        numeric;
  cert_id         uuid;
  v_student_name  text;
  v_course_title  text;
  v_course_cat    text;
BEGIN
  SELECT get_course_progress(p_course_id, p_user_id) INTO progress;
  IF progress < 100 THEN RETURN NULL; END IF;

  -- Mark enrollment complete
  UPDATE course_enrollments
  SET completed_at = now()
  WHERE course_id = p_course_id AND user_id = p_user_id AND completed_at IS NULL;

  -- Resolve student name snapshot
  SELECT COALESCE(up.display_name, split_part(au.email, '@', 1))
  INTO v_student_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = p_user_id;

  v_student_name := COALESCE(v_student_name, '');

  -- Resolve course title + category snapshots
  SELECT title, category INTO v_course_title, v_course_cat
  FROM courses WHERE id = p_course_id;

  v_course_title := COALESCE(v_course_title, '');
  v_course_cat   := COALESCE(v_course_cat, '');

  -- Insert or patch snapshot fields (never overwrite user-supplied department/growth_area)
  INSERT INTO course_certificates (course_id, user_id, student_name, course_title, course_category)
  VALUES (p_course_id, p_user_id, v_student_name, v_course_title, v_course_cat)
  ON CONFLICT (course_id, user_id) DO UPDATE
    SET student_name   = EXCLUDED.student_name,
        course_title   = EXCLUDED.course_title,
        course_category = EXCLUDED.course_category
  RETURNING id INTO cert_id;

  IF cert_id IS NULL THEN
    SELECT id INTO cert_id FROM course_certificates
    WHERE course_id = p_course_id AND user_id = p_user_id;
  END IF;

  RETURN cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add UPDATE policy so users can fill in the certificate details they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'course_certificates'
      AND policyname = 'Student can update own certificate'
  ) THEN
    CREATE POLICY "Student can update own certificate"
      ON course_certificates FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
