export type FileCategory =
  | 'image' | 'video' | 'audio' | 'pdf'
  | 'office-word' | 'office-excel' | 'office-powerpoint'
  | 'text' | 'code' | 'csv' | 'json' | 'markdown'
  | 'archive' | 'other';

export interface FileTypeInfo {
  category: FileCategory;
  dbType: 'image' | 'video' | 'audio' | 'document' | 'other';
  color: string;
  label: string;
}

export function detectFileType(fileName: string, mimeType?: string | null): FileTypeInfo {
  const name = (fileName ?? '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() ?? '' : '';
  const m = (mimeType ?? '').toLowerCase();

  if (m.startsWith('image/') || ['jpg','jpeg','png','gif','webp','avif','svg','bmp','heic','heif','ico','tiff'].includes(ext))
    return { category: 'image', dbType: 'image', color: '#10B981', label: 'Image' };

  if (m.startsWith('video/') || ['mp4','mov','webm','avi','mkv','m4v','ogv','flv','wmv'].includes(ext))
    return { category: 'video', dbType: 'video', color: '#EF4444', label: 'Video' };

  if (m.startsWith('audio/') || ['mp3','wav','ogg','m4a','flac','aac','opus','wma'].includes(ext))
    return { category: 'audio', dbType: 'audio', color: '#EC4899', label: 'Audio' };

  if (m === 'application/pdf' || ext === 'pdf')
    return { category: 'pdf', dbType: 'document', color: '#DC2626', label: 'PDF' };

  if (m.includes('word') || m.includes('officedocument.wordprocessing') || ['doc','docx','rtf','odt'].includes(ext))
    return { category: 'office-word', dbType: 'document', color: '#2563EB', label: 'Word' };

  if (m.includes('spreadsheet') || m.includes('excel') || m.includes('officedocument.spreadsheet') || ['xls','xlsx','ods'].includes(ext))
    return { category: 'office-excel', dbType: 'document', color: '#16A34A', label: 'Excel' };

  if (m.includes('presentation') || m.includes('officedocument.presentation') || ['ppt','pptx','odp','key'].includes(ext))
    return { category: 'office-powerpoint', dbType: 'document', color: '#EA580C', label: 'PowerPoint' };

  if (m === 'text/csv' || ext === 'csv')
    return { category: 'csv', dbType: 'document', color: '#0891B2', label: 'CSV' };

  if (m === 'application/json' || ext === 'json')
    return { category: 'json', dbType: 'document', color: '#7C3AED', label: 'JSON' };

  if (m === 'text/markdown' || ['md','markdown','mdx'].includes(ext))
    return { category: 'markdown', dbType: 'document', color: '#4F46E5', label: 'Markdown' };

  const codeExts = [
    'js','jsx','ts','tsx','mjs','cjs','vue','svelte',
    'py','rb','go','rs','java','kt','swift','c','cpp','h','hpp','cs',
    'php','sh','bash','zsh','ps1','bat','cmd',
    'sql','graphql','gql',
    'html','htm','css','scss','sass','less',
    'yml','yaml','toml','ini','env','conf','cfg',
    'xml','plist','dockerfile','makefile','lock',
    'r','m','dart','lua','scala','clj','ex','exs','elm',
  ];
  if (codeExts.includes(ext) || m === 'application/xml' || m === 'application/javascript' || m === 'text/javascript')
    return { category: 'code', dbType: 'document', color: '#475569', label: 'Code' };

  if (m.startsWith('text/') || ['txt','log','readme','license'].includes(ext))
    return { category: 'text', dbType: 'document', color: '#64748B', label: 'Text' };

  if (
    m === 'application/zip' || m === 'application/x-zip-compressed' ||
    m === 'application/x-rar-compressed' || m === 'application/x-7z-compressed' ||
    m === 'application/x-tar' || m === 'application/gzip' ||
    ['zip','rar','7z','tar','gz','tgz','bz2'].includes(ext)
  ) return { category: 'archive', dbType: 'other', color: '#F59E0B', label: 'Archive' };

  return { category: 'other', dbType: 'other', color: '#94A3B8', label: 'File' };
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
