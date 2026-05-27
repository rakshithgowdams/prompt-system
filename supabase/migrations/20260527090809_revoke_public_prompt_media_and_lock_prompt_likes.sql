/*
  # Revoke public hotlink access to prompt media + lock prompt_likes SELECT

  ## Fix #4 — Revoke public-read for published prompt media
  The policy "Public read for published prompt media" lets any unauthenticated
  client hotlink media files directly from storage, enabling bandwidth theft.
  Dropping it means media is only accessible to authenticated users (existing
  media_files RLS already enforces this) or via edge-function signed URLs.

  ## Fix #5 — Lock prompt_likes SELECT
  The policy "Anyone can read likes" uses USING (true) so any authenticated
  user can map the entire engagement graph of all users. Replace with per-user
  visibility only. Like counts are served via the get_prompt_stats() RPC which
  uses SECURITY DEFINER and is already correct.
*/

-- ── Fix #4: Drop the hotlink policy ──────────────────────────────────────────

DROP POLICY IF EXISTS "Public read for published prompt media" ON storage.objects;
DROP POLICY IF EXISTS "Public read published prompt media" ON storage.objects;

-- ── Fix #5: Lock prompt_likes SELECT to own rows only ────────────────────────

DROP POLICY IF EXISTS "Anyone can read likes" ON prompt_likes;
DROP POLICY IF EXISTS "Authenticated users can read all likes" ON prompt_likes;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prompt_likes' AND policyname = 'Users can read own likes'
  ) THEN
    CREATE POLICY "Users can read own likes"
      ON prompt_likes FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Ensure likes_count column exists on prompts for aggregate display ─────────

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- Backfill from actual likes
UPDATE prompts p
SET likes_count = (SELECT COUNT(*) FROM prompt_likes WHERE prompt_id = p.id)
WHERE likes_count = 0;

-- Trigger to keep likes_count in sync on INSERT / DELETE
CREATE OR REPLACE FUNCTION trg_update_prompt_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts SET likes_count = likes_count + 1 WHERE id = NEW.prompt_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prompts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.prompt_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prompt_likes_count_sync ON prompt_likes;
CREATE TRIGGER prompt_likes_count_sync
  AFTER INSERT OR DELETE ON prompt_likes
  FOR EACH ROW EXECUTE FUNCTION trg_update_prompt_likes_count();
