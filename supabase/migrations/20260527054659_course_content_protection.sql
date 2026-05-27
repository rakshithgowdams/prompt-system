/*
  # Course Content Protection -- Server-side enrollment gate

  1. Changes
    - Drop blanket course-asset read policies that allowed ANY authenticated user
      to access course lesson videos, images, and resources
    - Replace with enrollment-gated policy: only course owner or enrolled
      students can read course assets from storage
    - Add performance indexes for fast enrollment lookups

  2. Security
    - Non-enrolled users can no longer access course files via direct URLs
    - This is the foundational server-side enforcement layer for paid content

  3. Notes
    - Existing enrolled users are unaffected
    - Course owners retain full access to their own content
    - Course cover images remain readable for listings
*/

-- 1. Drop blanket course-asset policies
DROP POLICY IF EXISTS "Authenticated users can read course lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read course-covers folder" ON storage.objects;

-- 2. Enrollment-gated policy for course assets (videos, resources)
CREATE POLICY "Enrolled or owner can read course lesson assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND (name LIKE 'courses/%/lessons/%' OR name LIKE 'courses/%/resources/%')
    AND EXISTS (
      SELECT 1 FROM course_lessons cl
      JOIN courses c ON c.id = cl.course_id
      WHERE cl.video_path = storage.objects.name
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM course_enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
  );

-- 3. Keep course cover images readable by all authenticated users
CREATE POLICY "Authenticated can read course cover images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND name LIKE 'courses/%/cover%'
  );

-- 4. Speed indexes for enrollment check
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course
  ON course_enrollments (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_video_path
  ON course_lessons (video_path);
