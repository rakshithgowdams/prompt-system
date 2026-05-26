import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, Copy, Check, Sparkles, X,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  Heart, Eye, MessageCircle, Send, Trash2, User,
  BarChart2, Layers, Download,
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
// Full-screen takeover like reference: image carousel at top (dark bg), user row,
// stats, then prompt cards with per-image labels + copy buttons. Scrolls vertically.

function DetailModal({
  prompt,
  onClose,
}: {
  prompt: PublishedPrompt;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  const images = prompt.media_files.filter((f) => f.file_type === 'image');
  const videos = prompt.media_files.filter((f) => f.file_type === 'video');
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
  useEffect(() => {
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [comments.length]);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopiedAll(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch { toast.error('Failed to copy'); }
  }, [prompt.prompt_text]);

  const handleCopySection = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success('Copied!');
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { toast.error('Failed to copy'); }
  }, []);

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
    } catch { toast.error('Failed to post comment'); }
  };

  const handleDeleteComment = async (id: string) => {
    try { await deleteComment.mutateAsync({ id, promptId: prompt.id }); }
    catch { toast.error('Failed to delete comment'); }
  };

  const handleDownload = async () => {
    const url = urls[images[activeImage]?.id];
    if (!url) return;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = images[activeImage]?.file_name || 'image.png';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error('Download failed'); }
  };

  const scrollToImage = (idx: number) => {
    const el = imageScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
    setActiveImage(idx);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal container — mobile: full screen / tablet+: centered card with max dimensions */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full h-full md:h-[92vh] md:max-h-[900px] md:w-[95vw] md:max-w-[1200px] md:rounded-2xl md:shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* ─── Close button (always visible) ─── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/50 md:bg-ink-100 backdrop-blur-sm text-white md:text-ink-600 flex items-center justify-center hover:bg-black/70 md:hover:bg-ink-200 transition-colors active:scale-90"
        >
          <X size={16} />
        </button>

        {/* ═══════════════════════════════════════════════════════════════════════
            LEFT PANEL — Image / Media (fixed, no scroll)
            Mobile: top section with fixed height
            Tablet+: left half, full height
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="relative flex-shrink-0 bg-neutral-900 w-full md:w-[55%] lg:w-[50%] h-[38vh] md:h-full flex items-center justify-center overflow-hidden">
          {/* Image counter pill */}
          {images.length > 1 && (
            <div className="absolute top-3 left-3 z-20">
              <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
                {activeImage + 1} / {images.length}
              </span>
            </div>
          )}

          {/* Download button */}
          {images.length > 0 && urls[images[activeImage]?.id] && (
            <button
              onClick={handleDownload}
              className="absolute top-3 right-14 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors active:scale-90"
            >
              <Download size={15} />
            </button>
          )}

          {/* Image carousel */}
          {images.length > 0 ? (
            <>
              <div
                ref={imageScrollRef}
                className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={() => {
                  const el = imageScrollRef.current;
                  if (!el) return;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  setActiveImage(Math.min(idx, images.length - 1));
                }}
              >
                {images.map((img) => (
                  <div key={img.id} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-4">
                    {urlsLoading ? (
                      <div className="w-full h-full animate-pulse bg-neutral-800 rounded-lg" />
                    ) : urls[img.id] ? (
                      <img
                        src={urls[img.id]}
                        alt={img.file_name}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <ImageIcon size={40} className="text-neutral-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation arrows (desktop only) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => scrollToImage(Math.max(0, activeImage - 1))}
                    className={cn(
                      'hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg items-center justify-center text-ink-800 hover:bg-white transition-all active:scale-90',
                      activeImage === 0 && 'opacity-0 pointer-events-none',
                    )}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => scrollToImage(Math.min(images.length - 1, activeImage + 1))}
                    className={cn(
                      'hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg items-center justify-center text-ink-800 hover:bg-white transition-all active:scale-90',
                      activeImage === images.length - 1 && 'opacity-0 pointer-events-none',
                    )}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToImage(i)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-200',
                        i === activeImage ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/80',
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : videos.length > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              {urls[videos[0]?.id] && (
                <video src={urls[videos[0].id]} controls preload="metadata" className="max-w-full max-h-full rounded-lg" />
              )}
            </div>
          ) : (
            <ImageIcon size={48} className="text-neutral-600" />
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            RIGHT PANEL — Scrollable text content
            Mobile: below image, flex-1, scrolls Y
            Tablet+: right side, full height, scrolls Y independently
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col md:w-[45%] lg:w-[50%]">
          {/* Scrollable area */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Header: user info + platform badge */}
            <div className="sticky top-0 z-10 bg-white border-b border-ink-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-ink-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink-900 truncate">{prompt.title}</p>
                    <p className="text-[12px] text-ink-400 truncate">@{prompt.project_name || 'user'}</p>
                  </div>
                </div>
                <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap', platformMeta.pill)}>
                  {platformMeta.icon} {prompt.platform}
                </span>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-5 px-5 py-3 border-b border-ink-50 bg-white">
              <button
                onClick={handleLike}
                disabled={toggleLike.isPending}
                className={cn(
                  'flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-90',
                  stats?.user_has_liked ? 'text-red-500' : 'text-ink-500 hover:text-red-500',
                )}
              >
                <Heart size={16} className={cn('transition-all', stats?.user_has_liked ? 'fill-red-500' : '')} />
                <span>{statsLoading ? '–' : formatCount(stats?.like_count ?? 0)}</span>
              </button>
              <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
                <Eye size={15} />
                <span>{statsLoading ? '–' : formatCount(stats?.view_count ?? 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
                <MessageCircle size={15} />
                <span>{statsLoading ? '–' : formatCount(stats?.comment_count ?? 0)}</span>
              </div>
              <span className="ml-auto text-[11px] text-ink-300">{timeAgo(prompt.created_at)}</span>
            </div>

            {/* ── Prompt text ── */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-400 uppercase tracking-widest">
                  <ImageIcon size={11} />
                  IMAGE · {images.length > 0 ? images.length : 1}
                </span>
              </div>
              <div
                className="text-[13.5px] text-ink-800 leading-[1.75] whitespace-pre-wrap break-words overflow-y-auto overscroll-contain"
                style={{ maxHeight: '250px', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
              >
                {prompt.prompt_text}
              </div>
            </div>

            {/* Copy button for prompt */}
            <div className="px-5 pb-4">
              <button
                onClick={() => handleCopySection(prompt.prompt_text, -1)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-900 transition-colors border border-ink-200 rounded-lg px-3 py-1.5 hover:border-ink-300"
              >
                {copiedIdx === -1 ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copiedIdx === -1 ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Notes */}
            {prompt.notes && (
              <div className="mx-5 mb-4 p-4 bg-ink-50 rounded-xl border border-ink-100">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-[13px] text-ink-600 leading-[1.7] italic">{prompt.notes}</p>
              </div>
            )}

            {/* Tags */}
            {prompt.tags.length > 0 && (
              <div className="px-5 pb-4">
                <div className="flex flex-wrap gap-1.5">
                  {prompt.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-md bg-ink-900 text-white font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-ink-100 mx-5" />

            {/* ── Comments ── */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <MessageCircle size={12} />
                Comments {(stats?.comment_count ?? 0) > 0 && `(${stats!.comment_count})`}
              </p>
              <div className="space-y-4">
                {commentsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-ink-100 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-2.5 bg-ink-100 rounded w-20" />
                        <div className="h-2.5 bg-ink-100 rounded w-full" />
                      </div>
                    </div>
                  ))
                ) : comments.length === 0 ? (
                  <p className="text-[12px] text-ink-400 py-6 text-center">No comments yet. Be the first!</p>
                ) : (
                  <>
                    {comments.map((c) => (
                      <CommentBubble key={c.id} comment={c} currentUserId={user?.id} onDelete={handleDeleteComment} />
                    ))}
                    <div ref={commentsEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Spacer at bottom */}
            <div className="h-4" />
          </div>

          {/* ── Fixed bottom: comment input + copy all ── */}
          <div className="flex-shrink-0 border-t border-ink-100 bg-white" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
            {/* Comment input */}
            <form onSubmit={handleComment} className="flex items-center gap-2 px-4 py-2.5">
              <input
                ref={commentInputRef as unknown as React.RefObject<HTMLInputElement>}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? 'Add a comment...' : 'Sign in to comment'}
                disabled={!user || addComment.isPending}
                className="flex-1 text-[13px] bg-ink-50 border border-ink-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-200 placeholder:text-ink-400 text-ink-900 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!user || !commentText.trim() || addComment.isPending}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-ink-700 active:scale-90 transition-all"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
