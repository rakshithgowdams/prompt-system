/*
  # Add email_sent flag to course_certificates

  Tracks whether the congratulations email has been dispatched for each
  certificate so we never send it twice (e.g. on retry or page reload).

  1. Changes
    - `email_sent` boolean column added with default false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'course_certificates' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE course_certificates ADD COLUMN email_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;
