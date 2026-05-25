import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';
import type { Prompt, MediaFile } from './database.types';

const BUCKET = 'prompt-media';

async function fetchBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function downloadAllAsZip(prompt: Prompt, mediaFiles: MediaFile[]) {
  const zip = new JSZip();
  const folder = zip.folder(prompt.title.replace(/[^a-z0-9]/gi, '_')) ?? zip;

  folder.file('prompt.txt', buildPromptText(prompt));

  const images = mediaFiles.filter((f) => f.file_type === 'image');
  const videos = mediaFiles.filter((f) => f.file_type === 'video');

  for (const img of images) {
    const blob = await fetchBlob(img.file_path);
    folder.file(img.file_name, blob);
  }

  for (const vid of videos) {
    const blob = await fetchBlob(vid.file_path);
    folder.file(vid.file_name, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${prompt.title.replace(/[^a-z0-9]/gi, '_')}.zip`);
}

function buildPromptText(prompt: Prompt): string {
  return [
    `Title: ${prompt.title}`,
    `Platform: ${prompt.platform}`,
    `Status: ${prompt.status}`,
    `Tags: ${prompt.tags.join(', ')}`,
    `Created: ${new Date(prompt.created_at).toLocaleString()}`,
    '',
    '--- PROMPT ---',
    prompt.prompt_text,
    ...(prompt.notes ? ['', '--- NOTES ---', prompt.notes] : []),
  ].join('\n');
}
