import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { FileTypeIcon } from './FileTypeIcon';
import { detectFileType, formatFileSize, type FileCategory } from '../../lib/fileTypes';
import type { ProjectFile } from '../../hooks/useProjectFiles';

interface Props {
  file: (ProjectFile & { signedUrl: string }) | null;
  onClose: () => void;
  onDownload: (file: ProjectFile & { signedUrl: string }) => void;
}

export function FilePreview({ file, onClose, onDownload }: Props) {
  return (
    <AnimatePresence>
      {file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-5xl bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <PreviewHeader file={file} onClose={onClose} onDownload={onDownload} />
            <div className="flex-1 overflow-auto bg-ink-50 min-h-0">
              <PreviewBody file={file} onDownload={onDownload} />
            </div>
            <PreviewFooter file={file} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PreviewHeader({
  file, onClose, onDownload,
}: {
  file: ProjectFile & { signedUrl: string };
  onClose: () => void;
  onDownload: (f: ProjectFile & { signedUrl: string }) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-ink-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
          <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900 truncate">{file.file_name}</p>
          <p className="text-[11px] text-ink-500">
            {formatFileSize(file.file_size)} · {detectFileType(file.file_name, file.mime_type).label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onDownload(file)}>
          <Icon name="download" size={14} /> Download
        </Button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
          aria-label="Close preview"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}

function PreviewFooter({ file }: { file: ProjectFile & { signedUrl: string } }) {
  return (
    <div className="px-5 py-2 border-t border-ink-200 bg-white flex items-center justify-between text-[11px] text-ink-500 flex-shrink-0">
      <span>Added {new Date(file.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <span className="font-mono truncate max-w-[200px]">{file.mime_type ?? 'application/octet-stream'}</span>
    </div>
  );
}

function PreviewBody({
  file, onDownload,
}: {
  file: ProjectFile & { signedUrl: string };
  onDownload: (f: ProjectFile & { signedUrl: string }) => void;
}) {
  const info = detectFileType(file.file_name, file.mime_type);

  switch (info.category) {
    case 'image':              return <ImageView url={file.signedUrl} alt={file.file_name} />;
    case 'video':              return <VideoView url={file.signedUrl} />;
    case 'audio':              return <AudioView url={file.signedUrl} fileName={file.file_name} />;
    case 'pdf':                return <PdfView url={file.signedUrl} fileName={file.file_name} />;
    case 'office-word':
    case 'office-excel':
    case 'office-powerpoint':  return <OfficeView url={file.signedUrl} />;
    case 'csv':                return <CsvView url={file.signedUrl} />;
    case 'json':               return <JsonView url={file.signedUrl} />;
    case 'markdown':           return <MarkdownView url={file.signedUrl} />;
    case 'text':
    case 'code':               return <TextCodeView url={file.signedUrl} fileName={file.file_name} category={info.category} />;
    case 'archive':            return <ArchiveView url={file.signedUrl} fileName={file.file_name} onDownload={() => onDownload(file)} />;
    default:                   return <UnknownView file={file} onDownload={() => onDownload(file)} />;
  }
}

// ─── Individual viewers ──────────────────────────────────────────────────────

function ImageView({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[400px]">
      <img src={url} alt={alt} className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-sm" />
    </div>
  );
}

function VideoView({ url }: { url: string }) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[400px] bg-black">
      <video src={url} controls className="max-w-full max-h-[70vh] rounded-lg" />
    </div>
  );
}

function AudioView({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-12 min-h-[360px]">
      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-xl shadow-pink-200">
        <Icon name="music_note" size={56} className="text-white" />
      </div>
      <p className="text-base font-semibold text-ink-900 text-center max-w-xs truncate">{fileName}</p>
      <audio src={url} controls className="w-full max-w-md" />
    </div>
  );
}

function PdfView({ url, fileName }: { url: string; fileName: string }) {
  return <iframe src={url} className="w-full h-[75vh] border-0" title={fileName} />;
}

function OfficeView({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
  return (
    <div className="relative w-full h-[75vh]">
      <iframe src={viewerUrl} className="w-full h-full border-0" title="Office Document Preview" />
      <p className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-[10px] text-ink-500 px-2 py-1 rounded-md pointer-events-none">
        Powered by Microsoft Office Online
      </p>
    </div>
  );
}

function CsvView({ url }: { url: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        const parsed = parseCsv(text).slice(0, 101);
        setRows(parsed);
      } catch (e: any) { setError(e.message ?? 'Failed to load'); }
    })();
  }, [url]);

  if (error) return <ErrorView message={error} />;
  if (!rows) return <SpinnerView />;
  if (rows.length === 0) return <EmptyView message="Empty CSV file" />;
  const [header, ...body] = rows;
  return (
    <div className="p-4">
      <p className="text-xs text-ink-500 mb-3">Showing first {body.length} rows · {header.length} columns</p>
      <div className="overflow-auto border border-ink-200 rounded-lg bg-white max-h-[60vh]">
        <table className="text-xs w-full">
          <thead className="bg-ink-100 sticky top-0">
            <tr>{header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-ink-900 border-b border-ink-200 whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri} className="hover:bg-ink-50 border-b border-ink-100">
                {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-ink-700 whitespace-nowrap">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') { cell += ch; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function JsonView({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((raw) => {
        try { setText(JSON.stringify(JSON.parse(raw), null, 2)); }
        catch { setText(raw); }
      })
      .catch((e) => setError(e.message));
  }, [url]);
  if (error) return <ErrorView message={error} />;
  if (text === null) return <SpinnerView />;
  return (
    <pre className="p-5 text-xs font-mono text-ink-900 whitespace-pre-wrap break-words max-h-[75vh] overflow-auto bg-white">{text}</pre>
  );
}

const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p','br','span','strong','em','b','i','u','s','del','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','table','thead','tbody','tr','td','th','hr','div'],
  ALLOWED_ATTR: ['href','title','target','rel','src','alt','width','height','class','style'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
};

function MarkdownView({ url }: { url: string }) {
  const [rawHtml, setRawHtml] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then((r) => r.text()).then((md) => setRawHtml(renderMarkdown(md)));
  }, [url]);
  const safeHtml = useMemo(
    () => rawHtml !== null ? DOMPurify.sanitize(rawHtml, DOMPURIFY_CONFIG) as string : null,
    [rawHtml],
  );
  if (safeHtml === null) return <SpinnerView />;
  return (
    <div
      className="p-6 max-w-3xl mx-auto text-ink-900 bg-white"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

function renderMarkdown(md: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = escape(md);
  html = html.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (_m, _lang, code) =>
    `<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow:auto;font-size:12px;margin:12px 0"><code>${code}</code></pre>`);
  html = html
    .replace(/^### (.*$)/gim, '<h3 style="font-size:15px;font-weight:700;margin:16px 0 6px">$1</h3>')
    .replace(/^## (.*$)/gim,  '<h2 style="font-size:18px;font-weight:800;margin:20px 0 8px">$1</h2>')
    .replace(/^# (.*$)/gim,   '<h1 style="font-size:22px;font-weight:900;margin:24px 0 10px">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">$1</a>');
  html = html.replace(/^- (.+)$/gim, '<li style="margin:3px 0">$1</li>');
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul style="padding-left:20px;margin:8px 0">${m}</ul>`);
  html = html.split(/\n\n+/).map((p) =>
    p.startsWith('<') ? p : `<p style="margin:8px 0;line-height:1.7">${p.replace(/\n/g, '<br/>')}</p>`
  ).join('');
  return html;
}

function TextCodeView({ url, fileName, category }: { url: string; fileName: string; category: FileCategory }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText).catch((e) => setError(e.message));
  }, [url]);
  if (error) return <ErrorView message={error} />;
  if (text === null) return <SpinnerView />;
  return (
    <div className="p-4">
      <div className="rounded-xl bg-slate-900 text-slate-100 p-5 max-h-[70vh] overflow-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
          {category === 'code' ? `Code · .${fileName.split('.').pop()}` : 'Plain Text'}
        </p>
        <pre className="text-xs font-mono whitespace-pre leading-relaxed">{text}</pre>
      </div>
    </div>
  );
}

function ArchiveView({ url, fileName, onDownload }: { url: string; fileName: string; onDownload: () => void }) {
  const [entries, setEntries] = useState<{ name: string; size: number; dir: boolean }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!fileName.toLowerCase().endsWith('.zip')) { setError('non-zip'); return; }
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const list = Object.values(zip.files).slice(0, 200).map((f: any) => ({
          name: f.name,
          size: (f._data && (f._data as any).uncompressedSize) ?? 0,
          dir: f.dir,
        }));
        setEntries(list);
      } catch (e: any) { setError(e.message ?? 'Failed to read archive'); }
    })();
  }, [url, fileName]);

  if (error === 'non-zip') {
    return (
      <UnknownView
        file={{ file_name: fileName } as any}
        onDownload={onDownload}
        message="Archive previews are available for .zip files only. Download to extract."
      />
    );
  }
  if (error) return <ErrorView message={error} />;
  if (!entries) return <SpinnerView />;

  return (
    <div className="p-4">
      <p className="text-xs text-ink-500 mb-3">
        {entries.length} item{entries.length === 1 ? '' : 's'} inside this archive (showing first 200)
      </p>
      <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100 max-h-[55vh] overflow-auto">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-ink-50">
            <Icon name={e.dir ? 'folder' : 'description'} size={14} className={e.dir ? 'text-amber-500' : 'text-ink-400'} />
            <span className="flex-1 font-mono text-ink-900 truncate">{e.name}</span>
            {!e.dir && <span className="text-ink-500 flex-shrink-0">{formatFileSize(e.size)}</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Button onClick={onDownload}>
          <Icon name="download" size={14} /> Download archive
        </Button>
      </div>
    </div>
  );
}

function UnknownView({ file, onDownload, message }: { file: ProjectFile; onDownload: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center gap-5 p-16">
      <div className="w-24 h-24 rounded-2xl bg-ink-100 flex items-center justify-center">
        <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={48} />
      </div>
      <p className="text-sm text-ink-500 text-center max-w-md leading-relaxed">
        {message ?? "Preview isn't available for this file type. Download to open it in the right app."}
      </p>
      <Button onClick={onDownload}>
        <Icon name="download" size={14} /> Download file
      </Button>
    </div>
  );
}

function SpinnerView() {
  return (
    <div className="flex items-center justify-center p-16 min-h-[200px]">
      <div className="w-6 h-6 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-16">
      <Icon name="error" size={32} className="text-red-400" />
      <p className="text-sm text-ink-700 text-center max-w-md">Couldn&apos;t load preview: {message}</p>
    </div>
  );
}

function EmptyView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-16">
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}
