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

// ── Image Carousel (used inside detail modal) ─────────────────────────────────

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
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => { setActive(0); }, [images.length]);

  const prev = useCallback(() => setActive((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive((i) => (i + 1) % images.length), [images.length]);

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

  return (
    <>
      <div className="relative bg-black/5 rounded-xl overflow-hidden select-none">
        {/* Counter */}
        <div className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
          {active + 1} / {images.length}
        </div>

        {/* Main image */}
        <div
          className="relative cursor-zoom-in"
          style={{ minHeight: 280 }}
          onClick={() => setFullscreen(true)}
        >
          {loading ? (
            <div className="h-72 w-full animate-pulse bg-ink-100 rounded-xl" />
          ) : activeUrl ? (
            <motion.img
              key={active}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={activeUrl}
              alt={images[active]?.file_name}
              className="w-full object-contain max-h-80 rounded-xl"
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-ink-300">
              <ImageIcon size={32} />
            </div>
          )}
        </div>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={cn(
                'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                i === active ? 'border-ink-900 shadow-md' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              {urls[img.id] ? (
                <img src={urls[img.id]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-ink-100 flex items-center justify-center">
                  <ImageIcon size={12} className="text-ink-300" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen */}
      <AnimatePresence>
        {fullscreen && activeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setFullscreen(false)}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X size={18} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            <img
              src={activeUrl}
              alt=""
              className="max-w-[94vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-5 text-white/50 text-xs">
              {active + 1} / {images.length}
            </div>
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

  return (
    <AnimatePresence>
      {/* ── Backdrop ── */}
      <motion.div
        key="bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* ── MOBILE: full-screen bottom sheet (< md) ── */}
      <motion.div
        key="mobile-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl shadow-2xl"
        style={{ maxHeight: '95dvh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-ink-200" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 pb-3 border-b border-ink-100">
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ overflowY: 'auto' }}>
          {/* Media */}
          {hasMedia && <div className="space-y-3">{MediaContent}</div>}

          {/* Tabs */}
          <div className="flex border-b border-ink-100">
            {(['prompt', 'comments'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2 text-[12px] font-semibold capitalize transition-colors',
                  activeTab === tab ? 'text-ink-900 border-b-2 border-ink-900' : 'text-ink-400',
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

          {activeTab === 'prompt' ? PromptTextPanel : CommentsPanel}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-ink-100 px-4 py-3 space-y-2.5 bg-white"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {CommentInputBar}
          {CopyBtn}
        </div>
      </motion.div>

      {/* ── TABLET + DESKTOP: centred modal (≥ md) ── */}
      <motion.div
        key="desk-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4 lg:p-8 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row"
          style={{ maxWidth: 960, height: 'min(90vh, 700px)', minHeight: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── LEFT: media panel ── */}
          <div
            className="lg:w-[52%] flex-shrink-0 bg-[#f3f3f3] flex flex-col"
            style={{ minHeight: 0 }}
          >
            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
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
              style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#ddd transparent', minHeight: 0 }}>
              {MediaContent}
            </div>
          </div>

          {/* ── RIGHT: info panel ── */}
          <div
            className="flex-1 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-ink-100"
            style={{ minHeight: 0 }}
          >
            {/* Author + stats header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-ink-100">
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
            <div className="flex-1 overflow-y-auto p-5"
              style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#ddd transparent', minHeight: 0 }}>
              {activeTab === 'prompt' ? PromptTextPanel : CommentsPanel}
            </div>

            {/* Sticky footer: comment + copy */}
            <div className="flex-shrink-0 border-t border-ink-100 px-5 py-4 space-y-2.5 bg-white">
              {CommentInputBar}
              {CopyBtn}
            </div>
          </div>
        </div>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="break-inside-avoid mb-3"
    >
      <div
        onClick={onClick}
        className={cn(
          'group relative cursor-pointer rounded-2xl overflow-hidden bg-white',
          'shadow-[0_1px_4px_rgba(0,0,0,0.08)]',
          'hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]',
          'hover:-translate-y-0.5 active:scale-[0.99]',
          'transition-all duration-200',
        )}
      >
        {/* Image */}
        {firstImage ? (
          <div className="relative overflow-hidden">
            {loading ? (
              <div className="w-full bg-ink-100 animate-pulse" style={{ paddingBottom: '100%' }} />
            ) : urls[firstImage.id] ? (
              <img
                src={urls[firstImage.id]}
                alt={prompt.title}
                className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center">
                <Sparkles size={20} className="text-ink-300" />
              </div>
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />

            {/* Multi-image badge */}
            {images.length > 1 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                <ImageIcon size={9} />
                {images.length}
              </div>
            )}

            {/* Bottom overlay on hover */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-3 text-white">
                <span className="flex items-center gap-1 text-[11px]">
                  <Heart size={11} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
                  {formatCount(stats?.like_count ?? 0)}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Eye size={11} />
                  {formatCount(stats?.view_count ?? 0)}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <MessageCircle size={11} />
                  {formatCount(stats?.comment_count ?? 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Text-only card */
          <div className="p-4 bg-gradient-to-br from-ink-50 to-white min-h-[100px] flex flex-col justify-between">
            <p className="text-[12px] text-ink-700 leading-relaxed font-mono line-clamp-5">
              {prompt.prompt_text}
            </p>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-ink-400">
              <span className="flex items-center gap-0.5">
                <Heart size={9} className={cn(stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
                {formatCount(stats?.like_count ?? 0)}
              </span>
              <span className="flex items-center gap-0.5">
                <Eye size={9} />
                {formatCount(stats?.view_count ?? 0)}
              </span>
            </div>
          </div>
        )}

        {/* Card footer */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0', platformMeta.pill)}>
              {platformMeta.icon} {prompt.platform}
            </span>
            <span className="text-[10px] text-ink-400 flex-shrink-0 mt-0.5">{timeAgo(prompt.created_at)}</span>
          </div>
          <h3 className="font-semibold text-ink-900 text-[12px] leading-snug line-clamp-2 mt-1">
            {prompt.title}
          </h3>

          {/* Stats strip */}
          <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-ink-100 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <Heart size={10} className={cn('transition-colors', stats?.user_has_liked ? 'fill-red-400 text-red-400' : '')} />
              {formatCount(stats?.like_count ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={10} />
              {formatCount(stats?.view_count ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={10} />
              {formatCount(stats?.comment_count ?? 0)}
            </span>
          </div>
        </div>
      </div>
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
      <AnimatePresence>
        {selected && (
          <DetailModal key={selected.id} prompt={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
