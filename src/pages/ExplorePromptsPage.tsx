import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, Copy, Check, Sparkles, X,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  Heart, Eye, MessageCircle, Send, Trash2, User,
  BarChart2, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePublishedPrompts,
  usePromptStats,
  useRecordView,
  useToggleLike,
  usePromptComments,
  useAddComment,
  useDeleteComment,
  type PublishedPrompt,
  type PromptComment,
} from '../hooks/usePrompts';
import { Skeleton } from '../components/ui/Skeleton';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import type { MediaFile } from '../lib/database.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['All', 'Veo 3', 'Seedance 2.0', 'GPT Image', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;
const SORT_OPTIONS = ['Featured', 'Newest', 'Popular'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const PLATFORM_COLORS: Record<string, { pill: string; icon: string }> = {
  'Veo 3':        { pill: 'bg-blue-50 text-blue-700 border-blue-200',    icon: '🎬' },
  'Seedance 2.0': { pill: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🌱' },
  'GPT Image':    { pill: 'bg-green-50 text-green-700 border-green-200', icon: '🤖' },
  'Midjourney':   { pill: 'bg-rose-50 text-rose-700 border-rose-200',    icon: '🎨' },
  'ChatGPT':      { pill: 'bg-teal-50 text-teal-700 border-teal-200',    icon: '💬' },
  'Claude':       { pill: 'bg-orange-50 text-orange-700 border-orange-200', icon: '⚡' },
  'Other':        { pill: 'bg-ink-50 text-ink-600 border-ink-200',       icon: '✦' },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── useSignedUrls ─────────────────────────────────────────────────────────────

function useSignedUrls(mediaFiles: MediaFile[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mediaFiles.length === 0) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      mediaFiles.map(async (f) => {
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

// ── Image Carousel ────────────────────────────────────────────────────────────

function ImageCarousel({
  images,
  urls,
  loading,
}: {
  images: MediaFile[];
  urls: Record<string, string>;
  loading: boolean;
}) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = next, -1 = prev
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => { setActive(0); }, [images.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setActive((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setDirection(1);
    setActive((i) => (i + 1) % images.length);
  }, [images.length]);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen, prev, next]);

  if (images.length === 0) return null;

  const activeUrl = urls[images[active]?.id];

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  };

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden select-none bg-[#111]"
        style={{ minHeight: 260 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image stage */}
        <div
          className="relative cursor-zoom-in"
          style={{ minHeight: 260 }}
          onClick={() => activeUrl && setFullscreen(true)}
        >
          {loading ? (
            <div className="absolute inset-0 animate-pulse bg-ink-100 rounded-2xl" style={{ minHeight: 260 }} />
          ) : activeUrl ? (
            <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.img
                  key={active}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.32, 0, 0.18, 1] }}
                  src={activeUrl}
                  alt={images[active]?.file_name}
                  className="w-full object-contain rounded-2xl"
                  style={{ maxHeight: 380, display: 'block' }}
                  draggable={false}
                />
              </AnimatePresence>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30">
              <ImageIcon size={36} />
            </div>
          )}
        </div>

        {/* Gradient overlays for buttons */}
        {images.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/20 to-transparent pointer-events-none rounded-l-2xl" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/20 to-transparent pointer-events-none rounded-r-2xl" />
          </>
        )}

        {/* Counter pill */}
        <div className="absolute top-3 left-3 z-10 bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
          {active + 1} / {images.length}
        </div>

        {/* Expand hint */}
        {activeUrl && (
          <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-md text-white/80 text-[10px] px-2 py-1 rounded-full pointer-events-none">
            tap to expand
          </div>
        )}

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ChevronLeft size={17} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ChevronRight size={17} />
            </motion.button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && images.length <= 8 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <motion.button
                key={i}
                onClick={(e) => { e.stopPropagation(); setDirection(i > active ? 1 : -1); setActive(i); }}
                animate={{ width: i === active ? 18 : 6, opacity: i === active ? 1 : 0.5 }}
                transition={{ duration: 0.22 }}
                className="h-1.5 rounded-full bg-white"
                style={{ width: i === active ? 18 : 6 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <motion.button
              key={img.id}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setDirection(i > active ? 1 : -1); setActive(i); }}
              className={cn(
                'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200',
                i === active
                  ? 'border-ink-900 shadow-md opacity-100 ring-2 ring-ink-900/20'
                  : 'border-transparent opacity-50 hover:opacity-80',
              )}
            >
              {urls[img.id] ? (
                <img src={urls[img.id]} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-ink-100 flex items-center justify-center">
                  <ImageIcon size={12} className="text-ink-300" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {fullscreen && activeUrl && (
          <motion.div
            key="fs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/96 flex items-center justify-center"
            onClick={() => setFullscreen(false)}
          >
            {/* Close */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            >
              <X size={18} />
            </motion.button>

            {images.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronLeft size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, x: 2 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronRight size={20} />
                </motion.button>
              </>
            )}

            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.img
                key={active}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.32, 0, 0.18, 1] }}
                src={activeUrl}
                alt=""
                className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>

            {/* Counter */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs tabular-nums"
            >
              {active + 1} / {images.length}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Comment bubble ────────────────────────────────────────────────────────────

function CommentBubble({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: PromptComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  const isOwn = comment.user_id === currentUserId;
  const name = comment.user_profiles?.display_name || 'Anonymous';

  return (
    <div className="flex gap-2.5 group">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center overflow-hidden">
        {comment.user_profiles?.avatar_path ? (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${comment.user_profiles.avatar_path}`}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={13} className="text-ink-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[12px] font-semibold text-ink-800">{name}</span>
          <span className="text-[10px] text-ink-400">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-[13px] text-ink-700 leading-relaxed break-words">{comment.content}</p>
      </div>

      {isOwn && (
        <button
          onClick={() => onDelete(comment.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-400 hover:text-red-500 mt-0.5"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
// Responsive:
//   mobile  (<768px)  → full-screen bottom sheet, stacked (media top, info bottom)
//   tablet  (≥768px)  → centred modal, stacked with more breathing room
//   desktop (≥1024px) → side-by-side: images LEFT | info + comments RIGHT

function DetailModal({
  prompt,
  onClose,
}: {
  prompt: PublishedPrompt;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'prompt' | 'comments'>('prompt');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const images = prompt.media_files.filter((f) => f.file_type === 'image');
  const videos = prompt.media_files.filter((f) => f.file_type === 'video');
  const hasMedia = images.length + videos.length > 0;
  const { urls, loading: urlsLoading } = useSignedUrls(prompt.media_files);

  const { data: stats, isLoading: statsLoading } = usePromptStats(prompt.id);
  const { data: comments = [], isLoading: commentsLoading } = usePromptComments(prompt.id);
  const recordView = useRecordView();
  const toggleLike = useToggleLike();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const platformMeta = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];

  useEffect(() => { recordView.mutate(prompt.id); }, [prompt.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Auto-scroll to latest comment
  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, activeTab]);

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

  const handleLike = () => {
    if (!user) { toast.error('Sign in to like prompts'); return; }
    toggleLike.mutate({ promptId: prompt.id, liked: stats?.user_has_liked ?? false });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Sign in to comment'); return; }
    const text = commentText.trim();
    if (!text) return;
    try {
      await addComment.mutateAsync({ promptId: prompt.id, content: text });
      setCommentText('');
      setActiveTab('comments');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ id: commentId, promptId: prompt.id });
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  // ── shared sub-sections ──────────────────────────────────────────────────────

  const StatsRow = (
    <div className="flex items-center gap-5">
      <button
        onClick={handleLike}
        disabled={toggleLike.isPending}
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-95',
          stats?.user_has_liked ? 'text-red-500' : 'text-ink-400 hover:text-red-500',
        )}
      >
        <Heart size={16} className={cn('transition-all', stats?.user_has_liked ? 'fill-red-500' : '')} />
        <span>{statsLoading ? '–' : formatCount(stats?.like_count ?? 0)}</span>
      </button>
      <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
        <BarChart2 size={15} />
        <span>{statsLoading ? '–' : formatCount(stats?.view_count ?? 0)}</span>
      </div>
      <button
        onClick={() => { setActiveTab('comments'); setTimeout(() => commentInputRef.current?.focus(), 50); }}
        className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-800 transition-colors"
      >
        <MessageCircle size={15} />
        <span>{statsLoading ? '–' : formatCount(stats?.comment_count ?? 0)}</span>
      </button>
    </div>
  );

  const PromptTextPanel = (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Full Prompt</span>
          <span className="text-[10px] text-ink-400">{prompt.prompt_text.length} chars</span>
        </div>
        <div className="bg-ink-50 border border-ink-200 rounded-xl p-4">
          <p className="text-[13px] text-ink-800 leading-relaxed font-mono whitespace-pre-wrap break-words select-all">
            {prompt.prompt_text}
          </p>
        </div>
      </div>

      {prompt.tags.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider block mb-2">Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 border border-ink-200">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {prompt.notes && (
        <div className="border-l-2 border-ink-200 pl-3">
          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider block mb-1">Notes</span>
          <p className="text-[12px] text-ink-600 leading-relaxed italic">{prompt.notes}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-ink-400 pt-2 border-t border-ink-100">
        <Globe size={11} className="text-green-500" />
        <span>Public</span>
        <span className="text-ink-300">·</span>
        <span>{new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
  );

  const CommentsPanel = (
    <div className="space-y-3">
      {commentsLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-ink-100 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-2.5 bg-ink-100 rounded w-24" />
              <div className="h-2.5 bg-ink-100 rounded w-full" />
              <div className="h-2.5 bg-ink-100 rounded w-2/3" />
            </div>
          </div>
        ))
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle size={28} className="text-ink-200 mb-2" />
          <p className="text-[13px] font-semibold text-ink-500">No comments yet</p>
          <p className="text-[11px] text-ink-400 mt-1">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} currentUserId={user?.id} onDelete={handleDeleteComment} />
          ))}
          <div ref={commentsEndRef} />
        </>
      )}
    </div>
  );

  const CommentInputBar = (
    <form onSubmit={handleComment} className="flex items-end gap-2">
      <textarea
        ref={commentInputRef}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e); } }}
        placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
        disabled={!user || addComment.isPending}
        rows={1}
        className="flex-1 resize-none text-[13px] border border-ink-200 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 placeholder:text-ink-400 text-ink-900 bg-ink-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
        style={{ maxHeight: 88, overflowY: 'auto' }}
      />
      <button
        type="submit"
        disabled={!user || !commentText.trim() || addComment.isPending}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-700 active:scale-95 transition-all"
      >
        <Send size={14} />
      </button>
    </form>
  );

  const CopyBtn = (
    <button
      onClick={handleCopy}
      className={cn(
        'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold transition-all duration-200 active:scale-[0.98]',
        copied
          ? 'bg-green-500 text-white shadow-lg shadow-green-200/60'
          : 'bg-ink-900 text-white hover:bg-ink-800 shadow-lg shadow-ink-900/10',
      )}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied!' : 'Copy Prompt'}
    </button>
  );

  // ── Media left-panel content ─────────────────────────────────────────────────

  const MediaContent = (
    <>
      {images.length > 0 ? (
        <ImageCarousel images={images} urls={urls} loading={urlsLoading} />
      ) : videos.length > 0 ? (
        videos.map((vid) => urls[vid.id] && (
          <video key={vid.id} src={urls[vid.id]} controls preload="metadata"
            className="w-full rounded-xl bg-black" style={{ maxHeight: 380 }} />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-ink-300">
          <Sparkles size={32} className="mb-2" />
          <span className="text-sm">No media</span>
        </div>
      )}
      {/* Per-image prompt labels */}
      {images.length > 0 && (
        <div className="space-y-3 pt-1">
          {images.map((_img, i) => (
            <div key={i} className="bg-white border border-ink-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon size={11} className="text-ink-400" />
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Image · {i + 1}</span>
              </div>
              <p className="text-[12px] text-ink-700 leading-relaxed font-mono whitespace-pre-wrap line-clamp-6">
                {prompt.prompt_text}
              </p>
              <div className="mt-2.5 pt-2 border-t border-ink-100">
                <button
                  onClick={() => { navigator.clipboard.writeText(prompt.prompt_text); toast.success('Copied!'); }}
                  className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-800 transition-colors font-medium"
                >
                  <Copy size={10} /> Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Detect mobile via window width for animation choice — avoids rendering two modals
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* ── Single modal — mobile: bottom sheet / md+: centred overlay ── */}
      <motion.div
        key="modal-panel"
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
        transition={isMobile
          ? { type: 'spring', damping: 32, stiffness: 320 }
          : { type: 'spring', damping: 30, stiffness: 340 }}
        className={cn(
          'fixed z-[60]',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 md:inset-0',
          // md+: centred flex container
          'md:flex md:items-center md:justify-center md:p-4 lg:md:p-8',
        )}
        onClick={onClose}
      >
        {/* Inner white card */}
        <div
          className={cn(
            'bg-white w-full overflow-hidden',
            // Mobile: rounded top sheet
            'rounded-t-3xl md:rounded-3xl',
            // md+: max-width, fixed height, side-by-side
            'md:flex md:flex-col lg:flex-row md:shadow-2xl',
          )}
          style={{
            maxHeight: isMobile ? '95dvh' : 'min(90vh, 700px)',
            maxWidth: isMobile ? undefined : 960,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── MOBILE HEADER (drag handle + title + close) ── */}
          <div className="md:hidden flex-shrink-0">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-ink-200" />
            </div>
            <div className="flex items-start justify-between gap-3 px-4 pb-3 border-b border-ink-100">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink-900 leading-snug line-clamp-1">{prompt.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', platformMeta.pill)}>
                    {platformMeta.icon} {prompt.platform}
                  </span>
                  <span className="text-[10px] text-ink-400">{timeAgo(prompt.created_at)}</span>
                </div>
                <div className="mt-2">{StatsRow}</div>
              </div>
              <button onClick={onClose}
                className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-600">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── DESKTOP/TABLET layout: flex row on lg ── */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

            {/* ── LEFT / TOP: media panel ── */}
            <div
              className="lg:w-[52%] flex-shrink-0 bg-[#f3f3f3] flex flex-col"
              style={{ minHeight: 0 }}
            >
              {/* Media panel header — desktop only */}
              <div className="hidden md:flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                <span className="text-[12px] font-semibold text-ink-500">
                  {images.length + videos.length > 0
                    ? `${images.length + videos.length} media file${images.length + videos.length !== 1 ? 's' : ''}`
                    : 'No media'}
                </span>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black/[0.12] flex items-center justify-center transition-colors text-ink-700">
                  <X size={14} />
                </button>
              </div>
              {/* Scrollable media */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3"
                style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#ddd transparent', minHeight: 0, maxHeight: '40vh' }}>
                {hasMedia ? MediaContent : (
                  <div className="flex flex-col items-center justify-center py-16 text-ink-300">
                    <Sparkles size={32} className="mb-2" />
                    <span className="text-sm">No media</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT / BOTTOM: info panel ── */}
            <div
              className="flex-1 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-ink-100"
              style={{ minHeight: 0 }}
            >
              {/* Desktop header */}
              <div className="hidden md:block flex-shrink-0 px-5 pt-5 pb-4 border-b border-ink-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-ink-200 flex items-center justify-center flex-shrink-0">
                      <User size={17} className="text-ink-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-ink-900 leading-tight line-clamp-2">{prompt.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', platformMeta.pill)}>
                          {platformMeta.icon} {prompt.platform}
                        </span>
                        <span className="text-[10px] text-ink-400">{timeAgo(prompt.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-3">{StatsRow}</div>
              </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-ink-100">
              {(['prompt', 'comments'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors',
                    activeTab === tab ? 'text-ink-900 border-b-2 border-ink-900' : 'text-ink-400 hover:text-ink-700',
                  )}
                >
                  {tab}
                  {tab === 'comments' && (stats?.comment_count ?? 0) > 0 && (
                    <span className="ml-1 text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded-full">
                      {stats!.comment_count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable tab body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5"
              style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#ddd transparent', minHeight: 0 }}>
              {activeTab === 'prompt' ? PromptTextPanel : CommentsPanel}
            </div>

            {/* Sticky footer: comment + copy */}
            <div className="flex-shrink-0 border-t border-ink-100 px-4 md:px-5 py-3 md:py-4 space-y-2.5 bg-white"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              {CommentInputBar}
              {CopyBtn}
            </div>
            </div>{/* end right panel */}
          </div>{/* end flex row */}
        </div>{/* end white card */}
      </motion.div>
    </AnimatePresence>
  );
}

// ── MasonryGrid ───────────────────────────────────────────────────────────────

function MasonryGrid({ prompts, onSelect }: { prompts: PublishedPrompt[]; onSelect: (p: PublishedPrompt) => void }) {
  return (
    <div
      className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3"
      style={{ columnFill: 'balance' }}
    >
      {prompts.map((prompt, idx) => (
        <MasonryCard
          key={prompt.id}
          prompt={prompt}
          onClick={() => onSelect(prompt)}
          delay={idx * 0.03}
        />
      ))}
    </div>
  );
}

// ── HoverPreview (cursor-following detail tooltip) ───────────────────────────

function HoverPreview({
  prompt,
  stats,
  platformMeta,
  mouseX,
  mouseY,
}: {
  prompt: PublishedPrompt;
  stats: { like_count: number; view_count: number; comment_count: number; user_has_liked: boolean } | undefined;
  platformMeta: { pill: string; icon: string };
  mouseX: number;
  mouseY: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: mouseX, y: mouseY });
  const targetRef = useRef({ x: mouseX, y: mouseY });

  // Update target whenever prop changes
  useEffect(() => {
    targetRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  // Single RAF loop — lerp toward target for smooth cursor follow
  useEffect(() => {
    let frame: number;
    const loop = () => {
      setPos((p) => ({
        x: p.x + (targetRef.current.x - p.x) * 0.15,
        y: p.y + (targetRef.current.y - p.y) * 0.15,
      }));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Clamp so the card doesn't go off-screen
  const W = ref.current?.offsetWidth ?? 260;
  const H = ref.current?.offsetHeight ?? 200;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ox = 18; // offset from cursor
  const oy = 18;
  let left = pos.x + ox;
  let top = pos.y + oy;
  if (left + W > vw - 12) left = pos.x - W - ox;
  if (top + H > vh - 12) top = pos.y - H - oy;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none"
      style={{ left, top, width: 264 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-ink-100 overflow-hidden"
      >
        {/* Platform + time */}
        <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', platformMeta.pill)}>
            {platformMeta.icon} {prompt.platform}
          </span>
          <span className="text-[10px] text-ink-400">{timeAgo(prompt.created_at)}</span>
        </div>

        {/* Title */}
        <div className="px-3.5 pb-2">
          <p className="text-[13px] font-bold text-ink-900 leading-snug line-clamp-2">{prompt.title}</p>
        </div>

        {/* Prompt snippet */}
        <div className="mx-3.5 mb-3 bg-ink-50 rounded-xl px-3 py-2.5">
          <p className="text-[11px] font-mono text-ink-600 leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">
            {prompt.prompt_text}
          </p>
        </div>

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <div className="px-3.5 pb-3 flex flex-wrap gap-1">
            {prompt.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-500 border border-ink-200">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div className="flex items-center gap-4 px-3.5 py-2.5 border-t border-ink-100 bg-ink-50/60">
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <Heart size={11} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
            {formatCount(stats?.like_count ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <Eye size={11} />
            {formatCount(stats?.view_count ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <MessageCircle size={11} />
            {formatCount(stats?.comment_count ?? 0)}
          </span>
          <span className="ml-auto text-[10px] font-semibold text-ink-400">Click to open</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── MasonryCard ───────────────────────────────────────────────────────────────

function MasonryCard({
  prompt,
  onClick,
  delay,
}: {
  prompt: PublishedPrompt;
  onClick: () => void;
  delay: number;
}) {
  const images = prompt.media_files.filter((f) => f.file_type === 'image');
  const { urls, loading } = useSignedUrls(images.slice(0, 1));
  const firstImage = images[0];
  const platformMeta = PLATFORM_COLORS[prompt.platform] ?? PLATFORM_COLORS['Other'];
  const { data: stats } = usePromptStats(prompt.id);
  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="break-inside-avoid mb-3"
    >
      <motion.div
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.14)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="relative cursor-pointer rounded-2xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
        style={{ willChange: 'transform' }}
      >
        {/* ── Full image (natural aspect ratio, no crop) ── */}
        {firstImage ? (
          <div className="relative overflow-hidden bg-[#f0f0f0]">
            {loading ? (
              <div className="w-full animate-pulse bg-ink-100" style={{ paddingBottom: '75%' }} />
            ) : urls[firstImage.id] ? (
              <>
                <motion.img
                  src={urls[firstImage.id]}
                  alt={prompt.title}
                  animate={{ scale: hovered ? 1.035 : 1 }}
                  transition={{ duration: 0.45, ease: [0.32, 0, 0.18, 1] }}
                  className="w-full h-auto block"
                  loading="lazy"
                  draggable={false}
                />
                {/* Gradient overlay on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
                  animate={{ opacity: hovered ? 1 : 0 }}
                  transition={{ duration: 0.22 }}
                />
                {/* Stats pill — bottom of image */}
                <motion.div
                  className="absolute bottom-0 inset-x-0 flex items-center gap-3 px-3 pb-3"
                  animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="flex items-center gap-1 text-[11px] text-white font-medium">
                    <Heart size={11} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
                    {formatCount(stats?.like_count ?? 0)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-white">
                    <Eye size={11} /> {formatCount(stats?.view_count ?? 0)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-white">
                    <MessageCircle size={11} /> {formatCount(stats?.comment_count ?? 0)}
                  </span>
                </motion.div>
              </>
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center">
                <Sparkles size={24} className="text-ink-300" />
              </div>
            )}

            {/* Multi-image badge */}
            {images.length > 1 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                <ImageIcon size={9} /> {images.length}
              </div>
            )}
          </div>
        ) : (
          /* Text-only card */
          <div className="p-4 bg-gradient-to-br from-ink-50 to-white min-h-[100px] flex flex-col justify-between">
            <p className="text-[12px] text-ink-700 leading-relaxed font-mono line-clamp-5">{prompt.prompt_text}</p>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-ink-400">
              <span className="flex items-center gap-0.5">
                <Heart size={9} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
                {formatCount(stats?.like_count ?? 0)}
              </span>
              <span className="flex items-center gap-0.5">
                <Eye size={9} /> {formatCount(stats?.view_count ?? 0)}
              </span>
            </div>
          </div>
        )}

        {/* Card footer */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0', platformMeta.pill)}>
              {platformMeta.icon} {prompt.platform}
            </span>
            <span className="text-[10px] text-ink-400 flex-shrink-0 mt-0.5">{timeAgo(prompt.created_at)}</span>
          </div>
          <h3 className="font-semibold text-ink-900 text-[12px] leading-snug line-clamp-2 mt-1">{prompt.title}</h3>
          <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-ink-100 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <Heart size={10} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
              {formatCount(stats?.like_count ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={10} /> {formatCount(stats?.view_count ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={10} /> {formatCount(stats?.comment_count ?? 0)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Cursor-following detail preview */}
      <AnimatePresence>
        {hovered && (
          <HoverPreview
            key="preview"
            prompt={prompt}
            stats={stats}
            platformMeta={platformMeta}
            mouseX={mouse.x}
            mouseY={mouse.y}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Skeleton masonry card ─────────────────────────────────────────────────────

function SkeletonCard({ h }: { h: number }) {
  return (
    <div className="break-inside-avoid mb-3 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="bg-ink-100 animate-pulse" style={{ height: h }} />
      <div className="p-3 space-y-1.5">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ExplorePromptsPage() {
  const { data: prompts = [], isLoading } = usePublishedPrompts();
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('All');
  const [sort, setSort] = useState<SortOption>('Newest');
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

  // Dummy heights for skeleton placeholders
  const skeletonHeights = [160, 220, 130, 280, 170, 200, 150, 240, 190, 160, 210, 180];

  return (
    <>
      <div
        className="min-h-full"
        style={{ background: 'linear-gradient(160deg, #fafafa 0%, #f2f3f5 100%)' }}
      >
        {/* ── Sticky header ──────────────────────────────────────────── */}
        <div
          className="sticky top-0 z-20 border-b border-black/8"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
        >
          <div className="px-4 sm:px-6 lg:px-8 pt-3.5 pb-2">
            <div className="flex items-center gap-3">
              {/* Platform filter pills */}
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={cn(
                      'whitespace-nowrap text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 flex-shrink-0',
                      activePlatform === p
                        ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                        : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400 hover:text-ink-900',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Sort options (right side) */}
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={cn(
                      'text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors',
                      sort === s
                        ? 'text-ink-900 font-bold'
                        : 'text-ink-400 hover:text-ink-700',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-36 sm:w-48 pl-7 pr-3 py-1.5 text-[12px] border border-ink-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-ink-900/15 focus:border-ink-400 placeholder:text-ink-400 text-ink-900 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid content ───────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 lg:px-8 py-5">
          {isLoading ? (
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
              {skeletonHeights.map((h, i) => <SkeletonCard key={i} h={h} />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-ink-100 flex items-center justify-center mb-3 shadow-sm">
                <Globe size={22} className="text-ink-400" />
              </div>
              <p className="text-[15px] font-bold text-ink-900 mb-1.5">
                {search || activePlatform !== 'All' ? 'No matching prompts' : 'No published prompts yet'}
              </p>
              <p className="text-xs text-ink-500 max-w-[220px] leading-relaxed">
                {search || activePlatform !== 'All'
                  ? 'Try a different search or filter.'
                  : 'Be the first! Publish a prompt from your dashboard.'}
              </p>
              {!(search || activePlatform !== 'All') && (
                <Link
                  to="/dashboard"
                  className="mt-5 bg-ink-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-ink-700 transition-colors"
                >
                  Go to my prompts
                </Link>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <MasonryGrid key={activePlatform + search + sort} prompts={filtered} onSelect={setSelected} />
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal key={selected.id} prompt={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
