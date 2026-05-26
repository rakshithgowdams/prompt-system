/*
  # Allow any authenticated user to read course-covers storage folder

  ## Problem
  Course cover images are uploaded to paths like:
    {creatorUID}/course-covers/{courseId}.png

  The existing storage SELECT policies only allow:
  1. Users to read files where their own UID is in the path
  2. Users to read files in paths containing an "images" folder segment

  Since "course-covers" is a separate folder segment (not "images"),
  students viewing a course from another creator's account cannot generate
  signed URLs for the cover image — it silently fails to load.

  ## Fix
  Add a storage SELECT policy allowing any authenticated user to read files
  whose path contains the "course-covers" folder segment.
  This is safe because course covers are intentionally public to all users.
*/

CREATE POLICY "Authenticated users can read course cover folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'course-covers' = ANY(storage.foldername(name))
  );
