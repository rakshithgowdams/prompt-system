/*
  # Add timeline markers to course lessons

  1. Modified Tables
    - `course_lessons`
      - `timeline_markers` (jsonb, default '[]') - Array of {time_seconds, label} objects
        that instructors can set to mark key points in a video lesson

  2. Notes
    - Allows instructors to define chapter/timeline markers for video lessons
    - Markers appear on the video progress bar for students to click/jump to
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_lessons' AND column_name = 'timeline_markers'
  ) THEN
    ALTER TABLE course_lessons ADD COLUMN timeline_markers jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
