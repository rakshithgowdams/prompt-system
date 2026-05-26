interface FileTypeIconProps {
  mimeType?: string | null;
  fileName: string;
  fileType: string;
  size?: number;
  className?: string;
}

export function FileTypeIcon({ mimeType, fileName, fileType, size = 24, className = '' }: FileTypeIconProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const m = mimeType ?? '';

  const base = `flex-shrink-0 ${className}`;

  // ── Zip / archive ──
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'zst'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-yellow-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 2v20" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="4" width="4" height="3" rx="0.5" fill="currentColor" fillOpacity=".4"/>
        <rect x="10" y="9" width="4" height="3" rx="0.5" fill="currentColor" fillOpacity=".2"/>
        <rect x="10" y="14" width="4" height="4" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1"/>
        <circle cx="12" cy="16" r="1" fill="white" fillOpacity=".6"/>
      </svg>
    );
  }

  // ── PDF ──
  if (ext === 'pdf' || m === 'application/pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-red-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
        <text x="12" y="17" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" fontFamily="system-ui">PDF</text>
      </svg>
    );
  }

  // ── Word ──
  if (['doc', 'docx'].includes(ext) || m.includes('word')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-blue-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5"/>
        <text x="12" y="17" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" fontFamily="system-ui">DOC</text>
      </svg>
    );
  }

  // ── Excel / CSV ──
  if (['xls', 'xlsx', 'csv'].includes(ext) || m.includes('spreadsheet') || m.includes('excel')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-emerald-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 8h18M12 8v14M3 14h18" stroke="currentColor" strokeWidth="1.2"/>
        <text x="7.5" y="19" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="currentColor" fontFamily="system-ui">XLS</text>
      </svg>
    );
  }

  // ── PowerPoint ──
  if (['ppt', 'pptx'].includes(ext) || m.includes('presentation') || m.includes('powerpoint')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-orange-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="6" y="7" width="12" height="8" rx="1" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M12 15v3M9 18h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    );
  }

  // ── Image ──
  if (fileType === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-emerald-400`}>
        <rect x="2" y="3" width="20" height="18" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="8" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M22 16l-6-6L9 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 16l5-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // ── Video ──
  if (fileType === 'video' || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'wmv'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-blue-400`}>
        <rect x="2" y="5" width="15" height="14" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 9.5l5-3v11l-5-3v-5z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 9.5l3 2.5-3 2.5v-5z" fill="currentColor"/>
      </svg>
    );
  }

  // ── Audio ──
  if (fileType === 'audio' || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-pink-400`}>
        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="18" cy="16" r="3" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }

  // ── Code files ──
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'cs', 'sh', 'bash', 'sql'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-cyan-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8.5 9L5 12l3.5 3M15.5 9L19 12l-3.5 3M13 7l-2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // ── Web / config ──
  if (['html', 'css', 'json', 'xml', 'yml', 'yaml', 'toml', 'env', 'ini', 'cfg'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-teal-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 9l-3 3 3 3M16 9l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // ── Text / Markdown ──
  if (['txt', 'md', 'rtf', 'log'].includes(ext) || m.startsWith('text/')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-gray-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // ── Font ──
  if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-purple-400`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="Georgia,serif">A</text>
      </svg>
    );
  }

  // ── Executable / package ──
  if (['exe', 'dmg', 'pkg', 'deb', 'rpm', 'msi', 'app'].includes(ext)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-gray-300`}>
        <rect x="3" y="2" width="18" height="20" rx="2" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7h8M8 12h5M8 17h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="17" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    );
  }

  // ── Fallback ──
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${base} text-gray-400`}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
