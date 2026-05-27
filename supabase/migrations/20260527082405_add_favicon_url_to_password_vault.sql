/*
  # Add favicon_url column to password_vault

  ## Summary
  Adds a `favicon_url` column to store a custom or auto-fetched favicon URL
  per vault entry, so users can save the site favicon alongside their credentials.

  ## Changes
  - `password_vault`: new nullable `favicon_url text` column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_vault' AND column_name = 'favicon_url'
  ) THEN
    ALTER TABLE password_vault ADD COLUMN favicon_url text NOT NULL DEFAULT '';
  END IF;
END $$;
