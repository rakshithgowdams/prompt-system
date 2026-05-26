/*
  # Add Course Visibility (is_hidden)

  Instructors can manually hide a course from the Explore section
  without unpublishing it. Hidden courses still work for enrolled
  students and direct share links — they just won't appear in the
  public Explore listing.

  ## Changes
  - `courses.is_hidden` (boolean, default false) — when true, course
    does not appear in the Explore feed visible to other users.
    The instructor can still see it in "My Courses".
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
  END IF;
END $$;
