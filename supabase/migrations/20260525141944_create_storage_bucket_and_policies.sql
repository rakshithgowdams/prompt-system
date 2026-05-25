/*
  # Storage Bucket and Policies for PromptVault

  Creates the prompt-media storage bucket and access policies.
  Users can only access files in their own folder (UID-prefixed paths).
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-media',
  'prompt-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users upload own files'
  ) THEN
    CREATE POLICY "Users upload own files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'prompt-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- View policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users view own files'
  ) THEN
    CREATE POLICY "Users view own files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'prompt-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users delete own files'
  ) THEN
    CREATE POLICY "Users delete own files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'prompt-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
