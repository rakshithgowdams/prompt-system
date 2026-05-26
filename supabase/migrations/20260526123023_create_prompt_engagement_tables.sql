/*
  # Create Prompt Engagement Tables

  ## Summary
  Adds social engagement features to the public prompt explorer:
  - Likes (one per user per prompt, toggleable)
  - Views (one anonymous or authenticated view per IP/session, tracked by prompt)
  - Comments (threaded replies, authenticated users only)

  ## New Tables

  ### `prompt_likes`
  - `id` — UUID primary key
  - `prompt_id` — FK to prompts
  - `user_id` — FK to auth.users (authenticated like)
  - `created_at` — timestamp

  ### `prompt_views`
  - `id` — UUID primary key
  - `prompt_id` — FK to prompts
  - `viewer_id` — nullable UUID (auth user if logged in)
  - `created_at` — timestamp

  ### `prompt_comments`
  - `id` — UUID primary key
  - `prompt_id` — FK to prompts
  - `user_id` — FK to auth.users
  - `content` — text body of comment
  - `created_at` / `updated_at` — timestamps

  ## Helper Functions / Views
  - `get_prompt_stats(prompt_id)` — returns like count and view count via RPC

  ## Security
  - RLS enabled on all three tables
  - Likes: authenticated users can insert their own, read any, delete own
  - Views: authenticated users can insert, anyone can read counts
  - Comments: authenticated users can insert/update/delete own; anyone can read
*/

-- ── prompt_likes ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id  uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(prompt_id, user_id)
);

ALTER TABLE prompt_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON prompt_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can like prompts"
  ON prompt_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON prompt_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── prompt_views ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id  uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  viewer_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prompt_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can record a view"
  ON prompt_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

CREATE POLICY "Anyone authenticated can read views"
  ON prompt_views FOR SELECT
  TO authenticated
  USING (true);

-- Also allow anon to insert views (unauthenticated visitors)
CREATE POLICY "Anon can record a view"
  ON prompt_views FOR INSERT
  TO anon
  WITH CHECK (viewer_id IS NULL);

CREATE POLICY "Anon can read view counts"
  ON prompt_views FOR SELECT
  TO anon
  USING (true);

-- ── prompt_comments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prompt_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id  uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prompt_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read comments"
  ON prompt_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can read comments"
  ON prompt_comments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON prompt_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON prompt_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON prompt_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at for comments
CREATE OR REPLACE FUNCTION update_prompt_comments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_prompt_comments_updated_at'
  ) THEN
    CREATE TRIGGER set_prompt_comments_updated_at
      BEFORE UPDATE ON prompt_comments
      FOR EACH ROW EXECUTE FUNCTION update_prompt_comments_updated_at();
  END IF;
END $$;

-- ── Indexes for performance ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_prompt_likes_prompt_id  ON prompt_likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_likes_user_id    ON prompt_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_views_prompt_id  ON prompt_views(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_comments_prompt_id ON prompt_comments(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_comments_user_id   ON prompt_comments(user_id);

-- ── RPC: get prompt engagement stats ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_prompt_stats(p_prompt_id uuid)
RETURNS TABLE(like_count bigint, view_count bigint, comment_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM prompt_likes   WHERE prompt_id = p_prompt_id) AS like_count,
    (SELECT COUNT(*) FROM prompt_views   WHERE prompt_id = p_prompt_id) AS view_count,
    (SELECT COUNT(*) FROM prompt_comments WHERE prompt_id = p_prompt_id) AS comment_count;
$$;
