import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImageFile {
  id: string;
  original: File;
  originalSize: number;
  compressed: File | null;
  compressedSize: number | null;
  compressedUrl: string | null;
  previewUrl: string;
  status: 'idle' | 'compressing' | 'done' | 'error';
  progress: number;
  errorMsg: string | null;
}

interface CompressionSettings {
  targetMB: number;
  maxDimension: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function savingPercent(original: number, compressed: number): number {
  return Math.round((1 - compressed / original) * 100);
}

const PRESET_TARGETS = [
  { label: '1 MB', mb: 1, description: 'Web, social media' },
  { label: '3 MB', mb: 3, description: 'Email attachments' },
  { label: '5 MB', mb: 5, description: 'General use' },
  { label: '10 MB', mb: 10, description: 'Print-ready' },
];

// ── Main component ────────────────────────────────────────────────────────────

export function ImageReducerTool() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>({ targetMB: 1, maxDimension: 1920 });
  const [isDragging, setIsDragging] = useState(false);
  const [customMB, setCustomMB] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveMB = useCustom && customMB ? parseFloat(customMB) || settings.targetMB : settings.targetMB;

  const processFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!valid.length) return;

    const newEntries: ImageFile[] = valid.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      original: file,
      originalSize: file.size,
      compressed: null,
      compressedSize: null,
      compressedUrl: null,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
      errorMsg: null,
    }));

    setImages((prev) => [...prev, ...newEntries]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      if (img?.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const compressOne = async (id: string) => {
    setImages((prev) => prev.map((img) =>
      img.id === id ? { ...img, status: 'compressing', progress: 0, errorMsg: null } : img,
    ));

    const img = images.find((i) => i.id === id);
    if (!img) return;

    // Only compress if the file is above the target
    const targetBytes = effectiveMB * 1_000_000;
    if (img.originalSize <= targetBytes) {
      // Already small enough — mark done with original as "compressed"
      const blob = new File([img.original], img.original.name, { type: img.original.type });
      const url = URL.createObjectURL(blob);
      setImages((prev) => prev.map((i) =>
        i.id === id ? {
          ...i, status: 'done', progress: 100,
          compressed: blob, compressedSize: img.originalSize,
          compressedUrl: url,
        } : i,
      ));
      return;
    }

    try {
      const result = await imageCompression(img.original, {
        maxSizeMB: effectiveMB,
        maxWidthOrHeight: settings.maxDimension,
        useWebWorker: true,
        onProgress: (pct) => {
          setImages((prev) => prev.map((i) => i.id === id ? { ...i, progress: pct } : i));
        },
      });

      const compressedFile = new File([result], img.original.name, { type: result.type });
      const url = URL.createObjectURL(compressedFile);

      setImages((prev) => prev.map((i) =>
        i.id === id ? {
          ...i, status: 'done', progress: 100,
          compressed: compressedFile, compressedSize: compressedFile.size,
          compressedUrl: url,
        } : i,
      ));
    } catch {
      setImages((prev) => prev.map((i) =>
        i.id === id ? { ...i, status: 'error', errorMsg: 'Compression failed. Try a different image.' } : i,
      ));
    }
  };

  const compressAll = async () => {
    const toCompress = images.filter((i) => i.status === 'idle' || i.status === 'error');
    for (const img of toCompress) {
      await compressOne(img.id);
    }
  };

  const downloadOne = (img: ImageFile) => {
    if (!img.compressedUrl || !img.compressed) return;
    const a = document.createElement('a');
    a.href = img.compressedUrl;
    const ext = img.original.name.split('.').pop() ?? 'jpg';
    const base = img.original.name.replace(`.${ext}`, '');
    a.download = `${base}_reduced.${ext}`;
    a.click();
  };

  const downloadAll = () => {
    images.filter((i) => i.status === 'done').forEach(downloadOne);
  };

  const clearAll = () => {
    images.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      if (img.compressedUrl) URL.revokeObjectURL(img.compressedUrl);
    });
    setImages([]);
  };

  const hasIdle = images.some((i) => i.status === 'idle' || i.status === 'error');
  const hasDone = images.some((i) => i.status === 'done');
  const isCompressing = images.some((i) => i.status === 'compressing');

  const totalSavedBytes = images.reduce((sum, i) => {
    if (i.status === 'done' && i.compressedSize !== null) {
      return sum + Math.max(0, i.originalSize - i.compressedSize);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Settings row */}
      <div className="bg-white border border-ink-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Icon name="tune" size={14} className="text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-ink-900">Compression Settings</span>
        </div>

        {/* Target size presets */}
        <div>
          <p className="text-xs text-ink-500 mb-2 font-medium">Target file size</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_TARGETS.map((p) => (
              <button
                key={p.mb}
                onClick={() => { setSettings((s) => ({ ...s, targetMB: p.mb })); setUseCustom(false); }}
                className={cn(
                  'flex flex-col items-start px-3 py-1.5 rounded-xl border text-left transition-all text-xs',
                  !useCustom && settings.targetMB === p.mb
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-white border-ink-300 text-ink-700 hover:border-ink-500',
                )}
              >
                <span className="font-bold">{p.label}</span>
                <span className="text-[10px] opacity-70">{p.description}</span>
              </button>
            ))}

            {/* Custom */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all',
              useCustom ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-ink-300',
            )}>
              <span className="text-xs text-ink-600 font-medium">Custom:</span>
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.5"
                value={customMB}
                onChange={(e) => { setCustomMB(e.target.value); setUseCustom(true); }}
                onFocus={() => setUseCustom(true)}
                placeholder="MB"
                className="w-14 text-xs bg-transparent border-none outline-none text-ink-900 placeholder-ink-400"
              />
              <span className="text-xs text-ink-500">MB</span>
            </div>
          </div>
        </div>

        {/* Max dimension */}
        <div>
          <p className="text-xs text-ink-500 mb-2 font-medium">Max dimension (px)</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '1080p', px: 1920 },
              { label: '2K', px: 2560 },
              { label: '4K', px: 3840 },
              { label: 'Original', px: 99999 },
            ].map((d) => (
              <button
                key={d.px}
                onClick={() => setSettings((s) => ({ ...s, maxDimension: d.px }))}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                  settings.maxDimension === d.px
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-white border-ink-300 text-ink-700 hover:border-ink-500',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl transition-all cursor-pointer',
          'flex flex-col items-center justify-center gap-3 py-10 px-6 text-center',
          isDragging
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-ink-300 hover:border-emerald-400 hover:bg-emerald-50/40',
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
          isDragging ? 'bg-emerald-100' : 'bg-ink-100',
        )}>
          <Icon name="add_photo_alternate" size={24} className={isDragging ? 'text-emerald-600' : 'text-ink-400'} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-700">
            {isDragging ? 'Drop to add images' : 'Drop images here, or click to browse'}
          </p>
          <p className="text-xs text-ink-400 mt-1">JPEG, PNG, WebP, HEIC — multiple files supported</p>
        </div>
      </div>

      {/* Images list */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Bulk actions bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {hasIdle && (
                  <button
                    onClick={compressAll}
                    disabled={isCompressing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-200"
                  >
                    {isCompressing ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Compressing…
                      </>
                    ) : (
                      <>
                        <Icon name="compress" size={14} />
                        Compress all
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
              <div className="flex items-center gap-3">
                {totalSavedBytes > 0 && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                    Saved {formatBytes(totalSavedBytes)} total
                  </span>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-ink-400 hover:text-danger transition-colors flex items-center gap-1"
                >
                  <Icon name="delete_sweep" size={13} />
                  Clear all
                </button>
              </div>
            </div>

            {/* Image rows */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {images.map((img) => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="bg-white border border-ink-200 rounded-xl p-3 flex items-center gap-3 group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-ink-100">
                      <img
                        src={img.status === 'done' && img.compressedUrl ? img.compressedUrl : img.previewUrl}
                        alt={img.original.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-ink-900 truncate">{img.original.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-ink-500 flex-wrap">
                        <span>Original: <span className="font-medium text-ink-700">{formatBytes(img.originalSize)}</span></span>
                        {img.status === 'done' && img.compressedSize !== null && (
                          <>
                            <Icon name="arrow_forward" size={10} className="text-ink-300" />
                            <span className="font-medium text-emerald-700">{formatBytes(img.compressedSize)}</span>
                            {img.compressedSize < img.originalSize && (
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold text-[10px]">
                                -{savingPercent(img.originalSize, img.compressedSize)}%
                              </span>
                            )}
                            {img.compressedSize >= img.originalSize && (
                              <span className="bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded-full text-[10px]">
                                Already optimized
                              </span>
                            )}
                          </>
                        )}
                        {img.status === 'error' && (
                          <span className="text-danger">{img.errorMsg}</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {img.status === 'compressing' && (
                        <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${img.progress}%` }}
                            transition={{ ease: 'linear' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {img.status === 'idle' && (
                        <button
                          onClick={() => compressOne(img.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <Icon name="compress" size={12} />
                          Compress
                        </button>
                      )}
                      {img.status === 'error' && (
                        <button
                          onClick={() => compressOne(img.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          <Icon name="refresh" size={12} />
                          Retry
                        </button>
                      )}
                      {img.status === 'compressing' && (
                        <div className="w-7 h-7 flex items-center justify-center">
                          <svg className="animate-spin w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                      {img.status === 'done' && (
                        <button
                          onClick={() => downloadOne(img)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-700 transition-colors"
                        >
                          <Icon name="download" size={12} />
                          Save
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="w-7 h-7 rounded-lg text-ink-300 hover:text-danger hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty hint */}
      {images.length === 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-ink-400">
          <div className="flex items-center gap-1.5">
            <Icon name="check_circle" size={13} className="text-emerald-500" />
            Reduces file size by up to 90%
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="check_circle" size={13} className="text-emerald-500" />
            All processing happens in your browser — nothing is uploaded
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="check_circle" size={13} className="text-emerald-500" />
            Supports JPEG, PNG, WebP, HEIC
          </div>
        </div>
      )}
    </div>
  );
}
