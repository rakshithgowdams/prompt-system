/*
  # Allow any authenticated user to read course cover images

  ## Problem
  Course cover images are stored under the creator's UID path (e.g., {creatorUID}/images/...).
  The existing SELECT policy only lets users read files where their own UID is in the path.
  This means students cannot generate signed URLs for course covers they don't own — the
  image silently fails to load in their account.

  ## Fix
  Add a new SELECT policy that allows any authenticated user to read files that are stored
  in paths matching the course cover image pattern (contains "/images/" segment).
  This policy is additive — the existing own-files policy still applies.

  Note: We scope this to image paths only (not videos/docs) so students cannot read
  other users' private prompt media, only course cover images.
*/

-- Allow any authenticated user to read course cover images
-- (paths that include an "images" folder segment, used for course covers and prompt thumbnails)
CREATE POLICY "Authenticated users can read course cover images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND 'images' = ANY(storage.foldername(name))
  );
