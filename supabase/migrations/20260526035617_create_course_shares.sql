/*
  # Course Shares Table

  Enables instructors to generate public share links for their courses,
  with optional password protection and expiry dates.

  ## New Tables
  - `course_shares`
    - `id` (uuid, primary key) — the share token used in the URL
    - `course_id` (uuid, FK → courses) — which course is being shared
    - `user_id` (uuid, FK → auth.users) — the instructor who created the share
    - `share_name` (text) — friendly label for the share link
    - `access_type` (text) — "public" or "password"
    - `password_hash` (text, nullable) — SHA-256 hex hash for password-protected shares
    - `expires_at` (timestamptz, nullable) — optional expiry; NULL = never expires
    - `is_active` (boolean) — soft disable without deleting
    - `view_count` (integer) — incremented each public view
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; owners can manage their own shares
  - Separate SELECT policy allows reading shares by ID (for the public share page via edge function)
  - Edge function uses service role to bypass RLS and enforces all access rules manually

  ## Functions
  - `increment_course_share_view(share_id uuid)` — safely increments view_count
*/

CREATE TABLE IF NOT EXISTS course_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_name    text NOT NULL DEFAULT '',
  access_type   text NOT NULL DEFAULT 'public' CHECK (access_type IN ('public', 'password')),
  password_hash text,
  expires_at    timestamptz,
  is_active     boolean NOT NULL DEFAULT true,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own course shares"
  ON course_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create course shares"
  ON course_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own course shares"
  ON course_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete own course shares"
  ON course_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment view count safely
CREATE OR REPLACE FUNCTION increment_course_share_view(share_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE course_shares SET view_count = view_count + 1 WHERE id = share_id;
$$;
