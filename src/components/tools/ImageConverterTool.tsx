import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

interface ConvertEntry {
  id: string;
  original: File;
  originalSize: number;
  previewUrl: string;
  convertedUrl: string | null;
  convertedSize: number | null;
  convertedBlob: Blob | null;
  status: 'idle' | 'converting' | 'done' | 'error';
  errorMsg: string | null;
}

// ── Format definitions ────────────────────────────────────────────────────────

const FORMATS: { value: OutputFormat; label: string; ext: string; description: string }[] = [
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg',  description: 'Photos, small file size' },
  { value: 'image/png',  label: 'PNG',  ext: 'png',  description: 'Lossless, transparency' },
  { value: 'image/webp', label: 'WebP', ext: 'webp', description: 'Web-optimised, modern' },
  { value: 'image/avif', label: 'AVIF', ext: 'avif', description: 'Best compression, newest' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000)     return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'IMAGE';
}

function stripExtension(name: string): string {
  return name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
}

function sizeDelta(original: number, converted: number): { pct: number; smaller: boolean } {
  const pct = Math.round(Math.abs(1 - converted / original) * 100);
  return { pct, smaller: converted < original };
}

/** Convert an image File to the target MIME type using an offscreen canvas. */
async function convertImage(file: File, targetMime: OutputFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const srcUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(srcUrl);
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

      // For JPEG output, fill transparent areas white (JPEG has no alpha)
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Conversion produced an empty result'));
        },
        targetMime,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(srcUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = srcUrl;
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function ImageConverterTool() {
  const [entries, setEntries]         = useState<ConvertEntry[]>([]);
  const [targetFormat, setTargetFormat] = useState<OutputFormat>('image/webp');
  const [quality, setQuality]         = useState(92);
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFormat = FORMATS.find((f) => f.value === targetFormat)!;

  const processFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!valid.length) return;
    const newEntries: ConvertEntry[] = valid.map((file) => ({
      id:            `${file.name}-${file.lastModified}-${Math.random()}`,
      original:      file,
      originalSize:  file.size,
      previewUrl:    URL.createObjectURL(file),
      convertedUrl:  null,
      convertedSize: null,
      convertedBlob: null,
      status:        'idle',
      errorMsg:      null,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.previewUrl)    URL.revokeObjectURL(e.previewUrl);
      if (e?.convertedUrl)  URL.revokeObjectURL(e.convertedUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const convertOne = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    // Skip if already that format
    if (entry.original.type === targetFormat) {
      const url = URL.createObjectURL(entry.original);
      setEntries((prev) => prev.map((e) => e.id === id ? {
        ...e, status: 'done', convertedBlob: entry.original,
        convertedUrl: url, convertedSize: entry.originalSize,
      } : e));
      return;
    }

    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'converting', errorMsg: null } : e));

    try {
      const blob = await convertImage(entry.original, targetFormat, quality / 100);
      const url  = URL.createObjectURL(blob);
      setEntries((prev) => prev.map((e) => e.id === id ? {
        ...e, status: 'done', convertedBlob: blob, convertedUrl: url, convertedSize: blob.size,
      } : e));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'error', errorMsg: msg } : e));
    }
  };

  const convertAll = async () => {
    const toConvert = entries.filter((e) => e.status === 'idle' || e.status === 'error');
    for (const e of toConvert) await convertOne(e.id);
  };

  const downloadOne = (entry: ConvertEntry) => {
    if (!entry.convertedUrl) return;
    const a = document.createElement('a');
    a.href = entry.convertedUrl;
    a.download = `${stripExtension(entry.original.name)}.${selectedFormat.ext}`;
    a.click();
  };

  const downloadAll = () => entries.filter((e) => e.status === 'done').forEach(downloadOne);

  const clearAll = () => {
    entries.forEach((e) => {
      if (e.previewUrl)   URL.revokeObjectURL(e.previewUrl);
      if (e.convertedUrl) URL.revokeObjectURL(e.convertedUrl);
    });
    setEntries([]);
  };

  const hasIdle       = entries.some((e) => e.status === 'idle' || e.status === 'error');
  const hasDone       = entries.some((e) => e.status === 'done');
  const isConverting  = entries.some((e) => e.status === 'converting');

  return (
    <div className="space-y-5">

      {/* ── Settings ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-ink-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
            <Icon name="tune" size={14} className="text-sky-600" />
          </div>
          <span className="text-sm font-semibold text-ink-900">Conversion Settings</span>
        </div>

        {/* Target format */}
        <div>
          <p className="text-xs text-ink-500 mb-2 font-medium">Convert to</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setTargetFormat(fmt.value)}
                className={cn(
                  'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all',
                  targetFormat === fmt.value
                    ? 'bg-sky-50 border-sky-400 text-sky-700'
                    : 'bg-white border-ink-300 text-ink-700 hover:border-sky-300 hover:bg-sky-50/40',
                )}
              >
                <span className="text-sm font-bold leading-tight">{fmt.label}</span>
                <span className="text-[10px] opacity-60 leading-tight mt-0.5">{fmt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider — only relevant for lossy formats */}
        {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp' || targetFormat === 'image/avif') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-ink-500 font-medium">Quality</p>
              <span className="text-xs font-bold text-ink-900 tabular-nums">{quality}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-sky-500"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 ${quality}%, #e2e8f0 ${quality}%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-ink-400 mt-1">
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Drop zone ────────────────────────────────────────────────────────── */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl transition-all cursor-pointer',
          'flex flex-col items-center justify-center gap-3 py-10 px-6 text-center',
          isDragging
            ? 'border-sky-500 bg-sky-50'
            : 'border-ink-300 hover:border-sky-400 hover:bg-sky-50/40',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
          isDragging ? 'bg-sky-100' : 'bg-ink-100',
        )}>
          <Icon name="image" size={24} className={isDragging ? 'text-sky-600' : 'text-ink-400'} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-700">
            {isDragging ? 'Drop to add images' : 'Drop images here, or click to browse'}
          </p>
          <p className="text-xs text-ink-400 mt-1">
            JPEG, PNG, WebP, AVIF, HEIC, BMP, GIF — multiple files supported
          </p>
        </div>
        {entries.length === 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-3 py-1">
            <Icon name="swap_horiz" size={13} />
            Convert to {selectedFormat.label}
          </div>
        )}
      </div>

      {/* ── Entries list ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Bulk actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {hasIdle && (
                  <button
                    onClick={convertAll}
                    disabled={isConverting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shadow-sky-200"
                  >
                    {isConverting ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Converting…
                      </>
                    ) : (
                      <>
                        <Icon name="swap_horiz" size={14} />
                        Convert all to {selectedFormat.label}
                      </>
                    )}
                  </button>
                )}
                {hasDone && (
                  <button
                    onClick={downloadAll}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 text-white text-sm font-semibold hover:bg-ink-700 transition-all shadow-sm"
                  >
                    <Icon name="download" size={14} />
                    Download all
                  </button>
                )}
              </div>
              <button
                onClick={clearAll}
                className="text-xs text-ink-400 hover:text-danger transition-colors flex items-center gap-1"
              >
                <Icon name="delete_sweep" size={13} />
                Clear all
              </button>
            </div>

            {/* Row list */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {entries.map((entry) => {
                  const srcExt  = getExtension(entry.original);
                  const dstExt  = selectedFormat.label;
                  const isSame  = entry.original.type === targetFormat;
                  const delta   = entry.status === 'done' && entry.convertedSize !== null
                    ? sizeDelta(entry.originalSize, entry.convertedSize)
                    : null;

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      className="bg-white border border-ink-200 rounded-xl p-3 flex items-center gap-3"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-ink-100 relative">
                        <img
                          src={entry.status === 'done' && entry.convertedUrl ? entry.convertedUrl : entry.previewUrl}
                          alt={entry.original.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Format badge */}
                        <span className="absolute bottom-0 right-0 text-[8px] font-bold bg-black/60 text-white px-1 leading-tight rounded-tl">
                          {srcExt}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-ink-900 truncate">{entry.original.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-ink-500 flex-wrap">
                          {/* Format arrow */}
                          <span className="flex items-center gap-1 font-medium">
                            <span className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-700">{srcExt}</span>
                            <Icon name="arrow_forward" size={10} className="text-ink-300" />
                            <span className={cn(
                              'px-1.5 py-0.5 rounded font-bold',
                              entry.status === 'done' ? 'bg-sky-100 text-sky-700' : 'bg-ink-100 text-ink-500',
                            )}>{dstExt}</span>
                          </span>

                          {/* Sizes */}
                          <span>{formatBytes(entry.originalSize)}</span>
                          {entry.status === 'done' && entry.convertedSize !== null && (
                            <>
                              <Icon name="arrow_forward" size={10} className="text-ink-300" />
                              <span className="font-medium text-ink-700">{formatBytes(entry.convertedSize)}</span>
                              {delta && !isSame && (
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded-full font-bold text-[10px]',
                                  delta.smaller
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700',
                                )}>
                                  {delta.smaller ? '-' : '+'}{delta.pct}%
                                </span>
                              )}
                              {isSame && (
                                <span className="bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full text-[10px]">
                                  Same format
                                </span>
                              )}
                            </>
                          )}
                          {entry.status === 'error' && (
                            <span className="text-danger">{entry.errorMsg}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {entry.status === 'idle' && (
                          <button
                            onClick={() => convertOne(entry.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
                          >
                            <Icon name="swap_horiz" size={12} />
                            Convert
                          </button>
                        )}
                        {entry.status === 'error' && (
                          <button
                            onClick={() => convertOne(entry.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                          >
                            <Icon name="refresh" size={12} />
                            Retry
                          </button>
                        )}
                        {entry.status === 'converting' && (
                          <div className="w-7 h-7 flex items-center justify-center">
                            <svg className="animate-spin w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        )}
                        {entry.status === 'done' && (
                          <button
                            onClick={() => downloadOne(entry)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-700 transition-colors"
                          >
                            <Icon name="download" size={12} />
                            Save
                          </button>
                        )}
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="w-7 h-7 rounded-lg text-ink-300 hover:text-danger hover:bg-red-50 flex items-center justify-center transition-colors"
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty-state hints */}
      {entries.length === 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-ink-400">
          {[
            'AVIF → PNG, PNG → JPEG, WebP → JPEG…',
            'All conversion happens in your browser — nothing is uploaded',
            'Batch-convert dozens of images at once',
            'Adjust quality for lossy formats (JPEG, WebP, AVIF)',
          ].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <Icon name="check_circle" size={13} className="text-sky-500 flex-shrink-0" />
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
