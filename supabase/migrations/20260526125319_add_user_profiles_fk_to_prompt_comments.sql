/*
  # Add FK from prompt_comments.user_id to user_profiles

  The prompt_comments table references auth.users(id) but Supabase PostgREST
  cannot auto-join user_profiles unless there is a direct FK from
  prompt_comments.user_id → user_profiles.id.

  This migration adds that FK so the select query
  `prompt_comments(*, user_profiles(display_name, avatar_path))` works correctly.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'prompt_comments_user_id_profiles_fkey'
      AND table_name = 'prompt_comments'
  ) THEN
    ALTER TABLE prompt_comments
      ADD CONSTRAINT prompt_comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
