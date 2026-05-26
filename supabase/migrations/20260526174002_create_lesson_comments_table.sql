/*
  # Create lesson_comments table

  1. New Tables
    - `lesson_comments`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, FK → course_lessons)
      - `course_id` (uuid, FK → courses)
      - `user_id` (uuid, FK → auth.users)
      - `parent_id` (uuid, nullable, self-referencing for instructor replies)
      - `content` (text, the comment body)
      - `rating` (smallint 1-5, nullable — only on top-level comments)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can INSERT their own comments
    - Authenticated users can SELECT all comments for lessons they have access to
    - Users can UPDATE/DELETE only their own comments

  3. Notes
    - parent_id = null  → top-level student comment (with optional rating)
    - parent_id = <id>  → instructor reply to that comment
    - Indexes on lesson_id and user_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS lesson_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES lesson_comments(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) > 0),
  rating      smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_comments_lesson_id_idx ON lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS lesson_comments_course_id_idx ON lesson_comments(course_id);
CREATE INDEX IF NOT EXISTS lesson_comments_parent_id_idx ON lesson_comments(parent_id);
CREATE INDEX IF NOT EXISTS lesson_comments_user_id_idx  ON lesson_comments(user_id);

ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read comments for any lesson
CREATE POLICY "Authenticated users can read lesson comments"
  ON lesson_comments FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own lesson comments"
  ON lesson_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own lesson comments"
  ON lesson_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own lesson comments"
  ON lesson_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
