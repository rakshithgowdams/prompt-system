import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Copy, Check, Sparkles, Image, Video, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePublishedPrompts, type PublishedPrompt } from '../hooks/usePrompts';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { MediaFile } from '../lib/database.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['All', 'Veo 3', 'Seedance 2.0', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  'Veo 3':        'bg-blue-100 text-blue-700 border-blue-200',
  'Seedance 2.0': 'bg-amber-100 text-amber-700 border-amber-200',
  'Midjourney':   'bg-rose-100 text-rose-700 border-rose-200',
  'ChatGPT':      'bg-green-100 text-green-700 border-green-200',
  'Claude':       'bg-orange-100 text-orange-700 border-orange-200',
  'Other':        'bg-ink-100 text-ink-600 border-ink-200',
};

// ── Signed URL helper ─────────────────────────────────────────────────────────

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  urls,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X size={20} />
      </button>
      {urls.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        src={urls[index]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {urls.map((_, i) => (
            <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === index ? 'bg-white' : 'bg-white/30')} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Media gallery inside a card ───────────────────────────────────────────────

function CardMedia({
  mediaFiles,
  onHeightMeasured,
}: {
  mediaFiles: MediaFile[];
  onHeightMeasured?: (h: number) => void;
}) {
  const images = mediaFiles.filter((f) => f.file_type === 'image');
  const videos = mediaFiles.filter((f) => f.file_type === 'video');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toLoad = [...images, ...videos];
    if (toLoad.length === 0) { setLoading(false); return; }
    let cancelled = false;
    Promise.all(
      toLoad.map(async (f) => {
        try {
          const url = await getSignedUrl(f.file_path);
          return [f.id, url] as [string, string];
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach((r) => { if (r) map[r[0]] = r[1]; });
      setSignedUrls(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [mediaFiles.map((f) => f.id).join(',')]);

  // Report rendered height to parent so prompt scroll box can match it
  useEffect(() => {
    if (loading || !onHeightMeasured || !mediaRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mediaRef.current) onHeightMeasured(mediaRef.current.offsetHeight);
    });
    observer.observe(mediaRef.current);
    onHeightMeasured(mediaRef.current.offsetHeight);
    return () => observer.disconnect();
  }, [loading, onHeightMeasured]);

  if (images.length === 0 && videos.length === 0) return null;

  const imageUrls = images.map((f) => signedUrls[f.id]).filter(Boolean);

  return (
    <>
      <div ref={mediaRef} className="overflow-hidden border-b border-ink-300">
        {loading ? (
          <div className="aspect-video bg-ink-100 animate-pulse" />
        ) : images.length > 0 && signedUrls[images[0].id] ? (
          /* Stack images vertically — each image shows full height, no cropping */
          <div className="flex flex-col gap-0.5">
            {images.slice(0, 3).map((img, i) => (
              <div
                key={img.id}
                className="relative cursor-pointer group bg-ink-100"
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={signedUrls[img.id]}
                  alt={img.file_name}
                  className="w-full h-auto block group-hover:opacity-90 transition-opacity duration-200"
                />
                {i === 2 && images.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 3}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : videos.length > 0 && signedUrls[videos[0].id] ? (
          <video src={signedUrls[videos[0].id]} controls preload="metadata" className="w-full bg-black" />
        ) : null}

        {(images.length > 0 || videos.length > 0) && !loading && (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-ink-100 border-t border-ink-300">
            {images.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
                <Image size={12} />
                {images.length} image{images.length !== 1 ? 's' : ''}
              </span>
            )}
            {videos.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-ink-500 font-medium">
                <Video size={12} />
                {videos.length} video{videos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
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
    </>
  );
}

// ── Prompt card ───────────────────────────────────────────────────────────────

function PromptCard({ prompt }: { prompt: PublishedPrompt }) {
  const [copied, setCopied] = useState(false);
  const [mediaHeight, setMediaHeight] = useState<number>(0);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [prompt.prompt_text]);

  const platformColor = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];
  const hasMedia = prompt.media_files.length > 0;

  // Prompt scroll box height: matches image section height when available, else 160px default
  const promptScrollHeight = hasMedia && mediaHeight > 0 ? mediaHeight : 160;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-ink-300 rounded-2xl overflow-hidden hover:border-ink-500 hover:shadow-card-hover transition-all duration-200 flex flex-col"
    >
      {hasMedia && (
        <div className="flex-shrink-0">
          <CardMedia mediaFiles={prompt.media_files} onHeightMeasured={setMediaHeight} />
        </div>
      )}

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-ink-900 text-[15px] leading-snug line-clamp-2 mb-2">
              {prompt.title}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border', platformColor)}>
                {prompt.platform}
              </span>
              {prompt.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500 border border-ink-300">
                  #{tag}
                </span>
              ))}
              {prompt.tags.length > 2 && (
                <span className="text-[11px] text-ink-400">+{prompt.tags.length - 2}</span>
              )}
            </div>
          </div>
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            <Globe size={10} />
            Public
          </span>
        </div>

        {/* Prompt text — scrollable, height matches the image section height */}
        <div className="bg-ink-100 rounded-xl border border-ink-300 overflow-hidden">
          <div
            className="overflow-y-auto p-3.5"
            style={{
              height: `${promptScrollHeight}px`,
              scrollbarWidth: 'thin',
              scrollbarColor: '#D1D7DC transparent',
            }}
          >
            <p className="text-[13px] text-ink-700 leading-relaxed font-mono whitespace-pre-wrap break-words">
              {prompt.prompt_text}
            </p>
          </div>
        </div>

        {/* Notes */}
        {prompt.notes && (
          <p className="text-xs text-ink-500 leading-relaxed line-clamp-2 border-l-2 border-ink-300 pl-3 italic">
            {prompt.notes}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-ink-300 mt-auto">
          <p className="text-xs text-ink-400">
            {new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <button
            onClick={handleCopy}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150',
              copied
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-white text-ink-700 border-ink-300 hover:bg-ink-900 hover:text-white hover:border-ink-900',
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy prompt'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-ink-300 rounded-2xl overflow-hidden">
      <div className="aspect-video bg-ink-100 animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex justify-between pt-1 border-t border-ink-300">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Main page — renders inside AppShell ───────────────────────────────────────

export function ExplorePromptsPage() {
  const { data: prompts = [], isLoading } = usePublishedPrompts();
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('All');

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
    <div className="min-h-full bg-ink-100">

      {/* Page header — sticky inside the AppShell content area */}
      <div className="sticky top-0 z-20 bg-white border-b border-ink-300">
        {/* Title row */}
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-display font-black text-xl text-ink-900 tracking-tight leading-tight">
                  Explore Prompts
                </h1>
                <p className="text-xs text-ink-500 mt-0.5">
                  {isLoading ? 'Loading…' : `${prompts.length} public prompt${prompts.length !== 1 ? 's' : ''} from the community`}
                </p>
              </div>
            </div>

            {/* Desktop search */}
            <div className="hidden sm:flex relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-ink-300 rounded-xl bg-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-ink-500 text-ink-900"
              />
            </div>
          </motion.div>

          {/* Mobile search */}
          <div className="sm:hidden mt-3 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-ink-300 rounded-xl bg-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-ink-500 text-ink-900"
            />
          </div>
        </div>

        {/* Platform filter pills */}
        <div
          className="flex items-center gap-1.5 px-4 sm:px-6 lg:px-8 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={cn(
                'whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 flex-shrink-0',
                activePlatform === p
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-ink-300 hover:border-ink-700 hover:text-ink-900',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white border border-ink-300 flex items-center justify-center mb-4 shadow-sm">
              <Globe size={28} className="text-ink-400" />
            </div>
            <p className="text-lg font-display font-bold text-ink-900 mb-2">
              {search || activePlatform !== 'All' ? 'No matching prompts' : 'No published prompts yet'}
            </p>
            <p className="text-sm text-ink-500 max-w-xs leading-relaxed">
              {search || activePlatform !== 'All'
                ? 'Try a different search or filter.'
                : 'Be the first! Open any prompt you own and toggle it to Published.'}
            </p>
            {!(search || activePlatform !== 'All') && (
              <Link
                to="/dashboard"
                className="mt-6 bg-ink-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-ink-700 transition-colors"
              >
                Go to my prompts
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-ink-500 mb-5">
              {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}
              {(search || activePlatform !== 'All') && ' found'}
            </p>
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
