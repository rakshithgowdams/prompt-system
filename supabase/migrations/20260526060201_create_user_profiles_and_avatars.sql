/*
  # Create user_profiles table and avatars storage

  ## New Tables
  - `user_profiles`
    - `id` (uuid, pk) — matches auth.users.id
    - `display_name` (text) — user's public display name
    - `avatar_path` (text, nullable) — path in `avatars` storage bucket
    - `created_at`, `updated_at` (timestamptz)

  ## Storage
  - New bucket `avatars` (public) for profile pictures

  ## Security
  - RLS enabled on `user_profiles`
  - Users can read any profile (needed for course creator display)
  - Users can only insert/update their own profile
*/

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_path  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed to show course creator info)
CREATE POLICY "Authenticated users can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read (bucket is public)
CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
