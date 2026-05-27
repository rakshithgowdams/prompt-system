export const ALLOWED_UPLOAD_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv', 'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/zip', 'application/x-zip-compressed',
  'application/octet-stream',
]);

export function isAllowedMime(file: File): boolean {
  const name = file.name.toLowerCase();
  // Explicitly block SVG (can contain inline JS) and HTML
  if (file.type === 'image/svg+xml' || name.endsWith('.svg')) return false;
  if (file.type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) return false;
  // Explicitly block executable types
  if (name.endsWith('.exe') || name.endsWith('.sh') || name.endsWith('.bat') || name.endsWith('.ps1')) return false;
  return ALLOWED_UPLOAD_MIMES.has(file.type) || file.type === '' || file.type === 'application/octet-stream';
}
