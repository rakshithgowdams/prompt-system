/*
  # Allow public storage reads for published prompt media

  ## Summary
  Adds a storage policy so anyone can read files from the prompt-media bucket
  that belong to a published prompt. This enables the Explore page to display
  images and video thumbnails via signed URLs without requiring authentication.

  ## Changes
  - storage.objects: new SELECT policy on prompt-media bucket for published prompt files
*/

DROP POLICY IF EXISTS "Public read for published prompt media" ON storage.objects;
CREATE POLICY "Public read for published prompt media"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'prompt-media'
    AND EXISTS (
      SELECT 1
      FROM media_files mf
      JOIN prompts p ON p.id = mf.prompt_id
      WHERE mf.file_path = storage.objects.name
        AND p.is_published = true
    )
  );
