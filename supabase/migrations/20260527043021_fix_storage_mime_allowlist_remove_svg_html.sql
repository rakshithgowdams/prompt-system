/*
  # Fix storage bucket MIME allowlist — remove SVG and HTML

  ## Summary
  A previous migration accidentally included `text/html` in the prompt-media
  bucket allowlist. HTML and SVG files can contain inline JavaScript and pose
  XSS risks if served directly. This migration removes them.

  ## Changes
  - Removes `text/html` from allowed_mime_types (HTML can contain <script>)
  - Removes `image/svg+xml` from allowed_mime_types (SVG can contain inline JS)
  - Keeps all other previously allowed types

  ## Security note
  SVG and HTML uploads are now rejected at the storage layer, complementing
  the client-side isAllowedMime() check added to upload components.
*/

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg','image/png','image/webp','image/gif','image/avif',
  'video/mp4','video/quicktime','video/webm','video/x-msvideo',
  'audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4',
  'application/pdf',
  'text/plain','text/markdown','text/csv','application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
  'application/zip','application/x-zip-compressed','application/x-tar','application/gzip',
  'application/octet-stream'
],
file_size_limit = 524288000
WHERE id = 'prompt-media';
