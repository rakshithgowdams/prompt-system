/*
  # Create course_gallery table

  1. New Tables
    - `course_gallery`
      - `id` (uuid, primary key)
      - `course_id` (uuid, FK → courses)
      - `user_id` (uuid, FK → auth.users — the instructor who uploaded)
      - `media_type` ('image' | 'video')
      - `storage_path` (text — path inside prompt-media bucket)
      - `caption` (text, optional)
      - `position` (int, ordering)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Instructor can INSERT / UPDATE / DELETE their own gallery items
    - Enrolled students AND course owner can SELECT gallery items
*/

CREATE TABLE IF NOT EXISTS course_gallery (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type  text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL,
  caption     text NOT NULL DEFAULT '',
  position    int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_gallery ENABLE ROW LEVEL SECURITY;

-- Instructor can read their own gallery items
CREATE POLICY "Instructor can select own gallery"
  ON course_gallery FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT user_id FROM course_enrollments WHERE course_id = course_gallery.course_id
    )
    OR auth.uid() IN (
      SELECT user_id FROM courses WHERE id = course_gallery.course_id
    )
  );

-- Instructor can insert
CREATE POLICY "Instructor can insert gallery"
  ON course_gallery FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IN (
      SELECT user_id FROM courses WHERE id = course_gallery.course_id
    )
  );

-- Instructor can update their own items
CREATE POLICY "Instructor can update own gallery"
  ON course_gallery FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Instructor can delete their own items
CREATE POLICY "Instructor can delete own gallery"
  ON course_gallery FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_course_gallery_course_id ON course_gallery(course_id);
CREATE INDEX IF NOT EXISTS idx_course_gallery_position  ON course_gallery(course_id, position);
