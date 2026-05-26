import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, Copy, Check, Sparkles, X,
  ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePublishedPrompts, type PublishedPrompt } from '../hooks/usePrompts';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { MediaFile } from '../lib/database.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['All', 'Veo 3', 'Seedance 2.0', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  'Veo 3':        'bg-blue-100/80 text-blue-700 border-blue-200',
  'Seedance 2.0': 'bg-amber-100/80 text-amber-700 border-amber-200',
  'Midjourney':   'bg-rose-100/80 text-rose-700 border-rose-200',
  'ChatGPT':      'bg-green-100/80 text-green-700 border-green-200',
  'Claude':       'bg-orange-100/80 text-orange-700 border-orange-200',
  'Other':        'bg-white/60 text-ink-600 border-ink-200',
};

// ── Signed URL helper ─────────────────────────────────────────────────────────

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  urls, index, onClose, onPrev, onNext,
}: {
  urls: string[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/92 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10">
        <X size={20} />
      </button>
      {urls.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        src={urls[index]} alt=""
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {urls.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {urls.map((_, i) => (
            <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === index ? 'bg-white' : 'bg-white/30')} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── useSignedUrls — shared hook ───────────────────────────────────────────────

function useSignedUrls(mediaFiles: MediaFile[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toLoad = mediaFiles;
    if (toLoad.length === 0) { setLoading(false); return; }
    let cancelled = false;
    Promise.all(
      toLoad.map(async (f) => {
        try { return [f.id, await getSignedUrl(f.file_path)] as [string, string]; }
        catch { return null; }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach((r) => { if (r) map[r[0]] = r[1]; });
      setUrls(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [mediaFiles.map((f) => f.id).join(',')]);

  return { urls, loading };
}

// ── Compact thumbnail for the grid card ──────────────────────────────────────

function CardThumbnail({ mediaFiles }: { mediaFiles: MediaFile[] }) {
  const images = mediaFiles.filter((f) => f.file_type === 'image');
  const videos = mediaFiles.filter((f) => f.file_type === 'video');
  const { urls, loading } = useSignedUrls(mediaFiles.slice(0, 1));

  const firstImage = images[0];
  const firstVideo = videos[0];

  return (
    <div className="w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-ink-100 to-ink-200 relative">
      {loading ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-ink-100 to-ink-200" />
      ) : firstImage && urls[firstImage.id] ? (
        <img
          src={urls[firstImage.id]}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : firstVideo && urls[firstVideo.id] ? (
        <video src={urls[firstVideo.id]} className="w-full h-full object-cover" muted playsInline />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={24} className="text-ink-300" />
        </div>
      )}

      {/* Media count badge */}
      {(images.length + videos.length) > 1 && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
          {images.length > 1 && <><ImageIcon size={9} /><span>{images.length}</span></>}
          {videos.length > 0 && <><VideoIcon size={9} /><span>{videos.length}</span></>}
        </div>
      )}
    </div>
  );
}

// ── Detail bottom-sheet / modal ───────────────────────────────────────────────

function DetailModal({ prompt, onClose }: { prompt: PublishedPrompt; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = prompt.media_files.filter((f) => f.file_type === 'image');
  const videos = prompt.media_files.filter((f) => f.file_type === 'video');
  const { urls, loading } = useSignedUrls(prompt.media_files);
  const platformColor = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];
  const imageUrls = images.map((f) => urls[f.id]).filter(Boolean);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [prompt.prompt_text]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom on mobile, centred modal on desktop */}
      <motion.div
        key="sheet"
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[60] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/60 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-ink-300" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-ink-900 text-[16px] leading-snug line-clamp-2">
                {prompt.title}
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border', platformColor)}>
                  {prompt.platform}
                </span>
                {prompt.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500 border border-ink-200">
                    #{tag}
                  </span>
                ))}
                {prompt.tags.length > 3 && (
                  <span className="text-[10px] text-ink-400">+{prompt.tags.length - 3}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="flex-shrink-0 w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors text-ink-600">
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D7DC transparent' }}>

            {/* Media */}
            {prompt.media_files.length > 0 && (
              <div className="space-y-1.5">
                {loading ? (
                  <div className="aspect-video rounded-xl bg-ink-100 animate-pulse" />
                ) : (
                  <>
                    {images.map((img, i) => urls[img.id] && (
                      <div key={img.id} className="relative rounded-xl overflow-hidden cursor-pointer group" onClick={() => setLightboxIndex(i)}>
                        <img src={urls[img.id]} alt={img.file_name} className="w-full h-auto block group-hover:opacity-95 transition-opacity" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                    {videos.map((vid) => urls[vid.id] && (
                      <video key={vid.id} src={urls[vid.id]} controls preload="metadata" className="w-full rounded-xl bg-black" />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Prompt text */}
            <div>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-2">Prompt</p>
              <div className="bg-ink-50 border border-ink-200 rounded-xl overflow-hidden">
                <div
                  className="overflow-y-auto p-3.5"
                  style={{
                    maxHeight: '220px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#D1D7DC transparent',
                  }}
                >
                  <p className="text-[13px] text-ink-800 leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {prompt.prompt_text}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {prompt.notes && (
              <div className="border-l-2 border-ink-300 pl-3">
                <p className="text-xs text-ink-500 leading-relaxed italic">{prompt.notes}</p>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <Globe size={11} className="text-green-500" />
              <span>Public</span>
              <span className="text-ink-300">·</span>
              <span>{new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Sticky copy button */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-ink-200 bg-white/80 backdrop-blur-sm">
            <button
              onClick={handleCopy}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-200',
                copied
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'bg-ink-900 text-white hover:bg-ink-700 active:scale-[0.98] shadow-lg shadow-ink-900/20',
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox over the modal */}
      {lightboxIndex !== null && imageUrls.length > 0 && (
        <Lightbox
          urls={imageUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i! - 1 + imageUrls.length) % imageUrls.length)}
          onNext={() => setLightboxIndex((i) => (i! + 1) % imageUrls.length)}
        />
      )}
    </AnimatePresence>
  );
}

// ── Compact glass card (grid item) ────────────────────────────────────────────

function PromptCard({ prompt, onClick }: { prompt: PublishedPrompt; onClick: () => void }) {
  const platformColor = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];
  const hasMedia = prompt.media_files.length > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-2xl overflow-hidden flex flex-col',
        'bg-white/70 backdrop-blur-md',
        'border border-white/80 shadow-sm',
        'hover:shadow-lg hover:shadow-black/8 hover:border-white',
        'hover:-translate-y-0.5 active:scale-[0.98]',
        'transition-all duration-200',
        // Glass shimmer on hover
        'before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/40 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
      )}
    >
      {/* Thumbnail */}
      {hasMedia ? (
        <CardThumbnail mediaFiles={prompt.media_files} />
      ) : (
        /* No-media placeholder — compact gradient */
        <div className="w-full aspect-[4/3] rounded-t-2xl bg-gradient-to-br from-ink-100 via-ink-50 to-white flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-ink-100/30 to-ink-200/20" />
          <Sparkles size={22} className="text-ink-300 relative z-10" />
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Platform badge */}
        <span className={cn('self-start inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border', platformColor)}>
          {prompt.platform}
        </span>

        {/* Title */}
        <h3 className="font-display font-bold text-ink-900 text-[12px] sm:text-[13px] leading-snug line-clamp-2">
          {prompt.title}
        </h3>

        {/* Prompt preview — 2 lines max */}
        <p className="text-[11px] text-ink-500 leading-relaxed line-clamp-2 font-mono">
          {prompt.prompt_text}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-ink-100">
          <span className="text-[10px] text-ink-400">
            {new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
            <Globe size={9} />
            Public
          </span>
        </div>
      </div>

      {/* Tap hint overlay — subtle */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60 pointer-events-none group-hover:ring-white/90 transition-all" />
    </motion.article>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/70 border border-white/80 shadow-sm">
      <div className="aspect-[4/3] bg-ink-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-5/6" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex justify-between pt-1 border-t border-ink-100">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ExplorePromptsPage() {
  const { data: prompts = [], isLoading } = usePublishedPrompts();
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('All');
  const [selected, setSelected] = useState<PublishedPrompt | null>(null);

  const filtered = useMemo(() => {
    let list = prompts;
    if (activePlatform !== 'All') list = list.filter((p) => p.platform === activePlatform);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.prompt_text.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.platform.toLowerCase().includes(q),
      );
    }
    return list;
  }, [prompts, search, activePlatform]);

  return (
    <>
      {/* Page */}
      <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 50%, #eceef1 100%)' }}>

        {/* Sticky header */}
        <div
          className="sticky top-0 z-20 border-b border-white/60"
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div className="px-3 sm:px-6 lg:px-8 pt-4 pb-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-black text-[17px] text-ink-900 tracking-tight leading-none">
                  Explore Prompts
                </h1>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  {isLoading ? 'Loading…' : `${prompts.length} prompts · tap to view & copy`}
                </p>
              </div>
              {/* Desktop search */}
              <div className="hidden sm:flex relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-48 pl-7 pr-3 py-1.5 text-[13px] border border-ink-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 placeholder:text-ink-400 text-ink-900 transition-all"
                />
              </div>
            </motion.div>

            {/* Mobile search */}
            <div className="sm:hidden mt-2.5 relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts…"
                className="w-full pl-7 pr-3 py-2 text-[13px] border border-ink-200 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 placeholder:text-ink-400 text-ink-900"
              />
            </div>
          </div>

          {/* Platform pills */}
          <div className="flex items-center gap-1.5 px-3 sm:px-6 lg:px-8 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={cn(
                  'whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 flex-shrink-0',
                  activePlatform === p
                    ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                    : 'bg-white/80 text-ink-600 border-ink-200 hover:border-ink-500 hover:text-ink-900',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="px-3 sm:px-6 lg:px-8 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 flex items-center justify-center mb-3 shadow-sm">
                <Globe size={24} className="text-ink-400" />
              </div>
              <p className="text-base font-display font-bold text-ink-900 mb-1.5">
                {search || activePlatform !== 'All' ? 'No matching prompts' : 'No published prompts yet'}
              </p>
              <p className="text-xs text-ink-500 max-w-[220px] leading-relaxed">
                {search || activePlatform !== 'All'
                  ? 'Try a different search or filter.'
                  : 'Be the first! Publish a prompt from your dashboard.'}
              </p>
              {!(search || activePlatform !== 'All') && (
                <Link to="/dashboard" className="mt-5 bg-ink-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-ink-700 transition-colors">
                  Go to my prompts
                </Link>
              )}
            </motion.div>
          ) : (
            <>
              <p className="text-[11px] text-ink-400 mb-3">
                {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
                {(search || activePlatform !== 'All') && ' found'}
              </p>
              <AnimatePresence mode="popLayout">
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} onClick={() => setSelected(prompt)} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Detail modal / bottom sheet */}
      <AnimatePresence>
        {selected && (
          <DetailModal key={selected.id} prompt={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
