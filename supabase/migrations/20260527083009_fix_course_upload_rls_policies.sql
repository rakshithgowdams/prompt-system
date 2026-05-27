/*
  # Fix course upload RLS policies

  ## Problem
  Instructors get "new row violates row-level security policy" when uploading:
  - Course gallery images/videos  → path: course-gallery/{courseId}/...  (no uid segment)
  - Course cover images           → path: {uid}/course-covers/{courseId}.ext  (OK)
  - Lesson videos/images/files    → path: {uid}/courses/{courseId}/...  (OK)

  The gallery upload path does NOT include the user's uid, so the existing
  "Users can upload to own paths" INSERT policy (which checks uid = ANY foldername)
  rejects it.

  ## Fix
  1. Add a dedicated INSERT policy for course-gallery paths that validates
     ownership by joining the courses table.
  2. Add a SELECT policy for course-gallery so instructors/enrolled users can read.
  3. Add a DELETE + UPDATE policy for gallery so instructors can manage their items.
  4. Keep all existing policies intact.
*/

-- ── INSERT: course gallery ────────────────────────────────────────────────────
-- Allows authenticated users to upload to course-gallery/{courseId}/...
-- only if they own that course.

DROP POLICY IF EXISTS "Course owner can upload gallery items" ON storage.objects;
CREATE POLICY "Course owner can upload gallery items"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = 'course-gallery'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = (storage.foldername(name))[2]::uuid
        AND user_id = auth.uid()
    )
  );

-- ── SELECT: course gallery ────────────────────────────────────────────────────
-- Instructors and enrolled students can read gallery items.

DROP POLICY IF EXISTS "Course owner or enrolled can read gallery items" ON storage.objects;
CREATE POLICY "Course owner or enrolled can read gallery items"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = 'course-gallery'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = (storage.foldername(name))[2]::uuid
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.course_enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
  );

-- ── UPDATE: course gallery ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Course owner can update gallery items" ON storage.objects;
CREATE POLICY "Course owner can update gallery items"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = 'course-gallery'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = (storage.foldername(name))[2]::uuid
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = 'course-gallery'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = (storage.foldername(name))[2]::uuid
        AND user_id = auth.uid()
    )
  );

-- ── DELETE: course gallery ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Course owner can delete gallery items" ON storage.objects;
CREATE POLICY "Course owner can delete gallery items"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = 'course-gallery'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = (storage.foldername(name))[2]::uuid
        AND user_id = auth.uid()
    )
  );

-- ── Broad instructor INSERT for all course asset paths ────────────────────────
-- Covers: {uid}/courses/{courseId}/lessons/...
--         {uid}/courses/{courseId}/images/...
--         {uid}/courses/{courseId}/files/...
--         {uid}/courses/{courseId}/resources/...
-- These already match "Users can upload to own paths" because uid is segment[0].
-- Adding an explicit policy as belt-and-suspenders for any path variation.

DROP POLICY IF EXISTS "Course owner can upload lesson assets" ON storage.objects;
CREATE POLICY "Course owner can upload lesson assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[2] = 'courses'
  );

-- ── DELETE: course lesson assets ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Course owner can delete lesson assets" ON storage.objects;
CREATE POLICY "Course owner can delete lesson assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[2] = 'courses'
  );
