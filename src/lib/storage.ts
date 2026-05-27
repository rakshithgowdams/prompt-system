import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';

const BUCKET = 'prompt-media';

export type FileCategory = 'image' | 'video' | 'document' | 'audio' | 'other';

export function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv' ||
    mimeType === 'text/markdown'
  ) return 'document';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadImage(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    onProgress,
  });

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/images/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function uploadVideo(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'mp4';
  const path = `${userId}/videos/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function uploadAnyFile(userId: string, file: File): Promise<string> {
  const category = getFileCategory(file.type);
  const folder =
    category === 'image' ? 'images'
    : category === 'video' ? 'videos'
    : category === 'audio' ? 'audio'
    : 'documents';

  const ext = (file.name.split('.').pop() ?? 'bin').replace(/[^a-zA-Z0-9]/g, '');
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function uploadProjectFile(userId: string, projectId: string, file: File): Promise<string> {
  const category = getFileCategory(file.type);
  const folder =
    category === 'image' ? 'images'
    : category === 'video' ? 'videos'
    : category === 'audio' ? 'audio'
    : 'documents';

  const ext = (file.name.split('.').pop() ?? 'bin').replace(/[^a-zA-Z0-9]/g, '');
  const path = `${userId}/projects/${projectId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function uploadProjectCover(userId: string, projectId: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
  });
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/project-covers/${projectId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadFile(path: string, fileName: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
