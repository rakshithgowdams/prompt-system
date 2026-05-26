/*
  # Fix Storage Bucket and Policies

  ## Problems fixed
  1. allowed_mime_types was too restrictive — blocked PDFs, audio, docs, zip, etc.
  2. File size limit was 50MB — increased to 500MB for video uploads
  3. RLS INSERT policy required uid as folder[1], but course paths use
     covers/{uid}/... and courses/{uid}/... where folder[1] is "covers"/"courses",
     not the uid. Fixed to check ANY segment of the path.
  4. Added missing UPDATE policy (needed for upsert on cover images).
  5. SELECT policy similarly restricted — fixed to allow uid anywhere in path.
*/

-- ── Update bucket: remove mime type restriction, increase size limit ──────────

UPDATE storage.buckets
SET
  allowed_mime_types = NULL,
  file_size_limit    = 524288000
WHERE id = 'prompt-media';

-- ── Drop old restrictive policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "Users upload own files"  ON storage.objects;
DROP POLICY IF EXISTS "Users view own files"    ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files"  ON storage.objects;
DROP POLICY IF EXISTS "Users update own files"  ON storage.objects;

-- ── New policies: uid can appear at any position in the path ──────────────────

-- INSERT: allow upload when uid appears anywhere in the path segments
CREATE POLICY "Users can upload to own paths"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prompt-media'
    AND auth.uid()::text = ANY(storage.foldername(name))
  );

-- SELECT: allow read when uid appears anywhere in the path segments
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND auth.uid()::text = ANY(storage.foldername(name))
  );

-- UPDATE: required for upsert operations (cover images)
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND auth.uid()::text = ANY(storage.foldername(name))
  )
  WITH CHECK (
    bucket_id = 'prompt-media'
    AND auth.uid()::text = ANY(storage.foldername(name))
  );

-- DELETE: allow delete when uid appears anywhere in path
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prompt-media'
    AND auth.uid()::text = ANY(storage.foldername(name))
  );
