/*
  # Extend media_files to support all file types

  ## Changes

  ### Modified Tables
  - `media_files`
    - Expand `file_type` CHECK constraint from ('image', 'video') to include 'document', 'audio', 'other'
    - This allows PDFs, Word docs, spreadsheets, audio files, and any other file to be attached

  ## Notes
  - No data is lost; existing image/video rows remain valid
  - The frontend will use the MIME type to determine how to render/preview files
*/

ALTER TABLE media_files
  DROP CONSTRAINT IF EXISTS media_files_file_type_check;

ALTER TABLE media_files
  ADD CONSTRAINT media_files_file_type_check
  CHECK (file_type IN ('image', 'video', 'document', 'audio', 'other'));
