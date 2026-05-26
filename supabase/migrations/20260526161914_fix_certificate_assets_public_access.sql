/*
  # Fix certificate-assets bucket public access

  Ensures the certificate-assets bucket is truly public and that
  all three asset files are accessible without authentication.
  Drops and recreates the SELECT policy to be explicit.
*/

-- Make sure bucket is flagged public
UPDATE storage.buckets
SET public = true
WHERE id = 'certificate-assets';

-- Drop existing SELECT policy and recreate cleanly
DROP POLICY IF EXISTS "Public read certificate assets" ON storage.objects;

CREATE POLICY "Public read certificate assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'certificate-assets');
