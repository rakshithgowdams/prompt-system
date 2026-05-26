/*
  # Create certificate-assets storage bucket

  Stores the three certificate images:
  - company logo (Group_23.png)
  - round seal (Group_22_1.png)
  - founder signature (founder-signature_1.png)

  Public read access so the certificate renderer can load them via <img>.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-assets',
  'certificate-assets',
  true,
  5242880,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public read certificate assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'certificate-assets');

-- Allow authenticated users (admin) to upload
CREATE POLICY "Authenticated upload certificate assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificate-assets');
