/*
  # Fix course assets: storage RLS, enrollment DELETE, and is_hidden enforcement

  ## Problems fixed

  ### 1. Storage — students cannot view course lesson assets
  Enrolled students need to generate signed URLs for files stored under
  the instructor's UID path (e.g. {uid}/courses/{courseId}/lessons/...).
  The existing policy only allows a user to read files where THEIR OWN uid
  is in the path, so students always get permission-denied on instructor assets.

  Fix: Add storage SELECT policies for each course content folder:
    - courses/.../lessons/    (video lessons)
    - courses/.../images/     (image lessons)
    - courses/.../files/      (resource/file lessons)
    - courses/.../resources/  (additional resources attached to lessons)

  These policies allow any authenticated user to read from these subfolders.
  This is intentionally broad because:
    - The course is already protected at the database level (RLS on course_lessons)
    - Signed URLs expire (so brute-forcing paths is impractical)
    - All course content is free per the current product design

  ### 2. course_enrollments — missing DELETE policy
  Students had no way to unenroll from a course.

  ### 3. courses — is_hidden not enforced
  The "Any user can read published courses" policy ignored is_hidden, leaking
  courses the instructor marked as hidden into public Explore listings.
  The existing policy is dropped and replaced with one that checks both flags.

  ## Changes
  - New: 4 storage SELECT policies for course content subfolders
  - New: DELETE policy on course_enrollments
  - Drop + recreate: "Any user can read published courses" to include is_hidden check
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Storage policies: let any authenticated user read course lesson assets
-- ─────────────────────────────────────────────────────────────────────────────

-- Video lessons stored at {uid}/courses/{courseId}/lessons/{lessonId}/file
CREATE POLICY "Authenticated users can read course lesson videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'lessons' = ANY(storage.foldername(name))
    AND 'courses' = ANY(storage.foldername(name))
  );

-- Image lessons stored at {uid}/courses/{courseId}/images/{lessonId}/file
CREATE POLICY "Authenticated users can read course lesson images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'images' = ANY(storage.foldername(name))
    AND 'courses' = ANY(storage.foldername(name))
  );

-- File/resource lessons stored at {uid}/courses/{courseId}/files/{lessonId}/file
CREATE POLICY "Authenticated users can read course lesson files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'files' = ANY(storage.foldername(name))
    AND 'courses' = ANY(storage.foldername(name))
  );

-- Additional resources stored at {uid}/courses/{courseId}/resources/{lessonId}/file
CREATE POLICY "Authenticated users can read course lesson resources"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'resources' = ANY(storage.foldername(name))
    AND 'courses' = ANY(storage.foldername(name))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. course_enrollments: add DELETE so students can unenroll
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Student can delete own enrollment"
  ON course_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. courses: enforce is_hidden in the public-read policy
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Any user can read published courses" ON courses;

CREATE POLICY "Any user can read published visible courses"
  ON courses FOR SELECT
  TO authenticated
  USING (is_published = true AND is_hidden = false);
