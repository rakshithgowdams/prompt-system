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
// Layout: single sheet that slides up from bottom on all screen sizes.
// Structure (top → bottom, single scroll):
//   • Sticky header (drag handle + title + close)
//   • Images inline (plain img tags, no animation, natural aspect ratio)
//   • Platform / meta row
//   • Stats row (like / views / comments)
//   • Tabs: Prompt | Comments
//   • Tab content (scrollable)
//   • Sticky footer: comment input + copy button

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
  const [activeImage, setActiveImage] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    if (activeTab === 'comments') {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [comments.length, activeTab]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
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
    } catch { toast.error('Failed to post comment'); }
  };

  const handleDeleteComment = async (id: string) => {
    try { await deleteComment.mutateAsync({ id, promptId: prompt.id }); }
    catch { toast.error('Failed to delete comment'); }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Centering wrapper — fixed full-screen flex container */}
      <div
        className="fixed inset-0 z-[60] flex items-end md:items-end justify-center pointer-events-none"
        onClick={onClose}
      >
        {/* Sheet — slides up from bottom, properly centered */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 34, stiffness: 360, mass: 0.9 }}
          className="pointer-events-auto w-full max-w-[100vw] sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col bg-white rounded-t-3xl shadow-2xl"
          style={{ maxHeight: '92dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* ── Sticky header ── */}
        <div className="flex-shrink-0 pt-3 pb-0">
          {/* Drag pill */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-[5px] rounded-full bg-ink-200" />
          </div>
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 px-5 pb-4 border-b border-ink-100">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-bold text-ink-900 leading-snug line-clamp-2 pr-2">{prompt.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', platformMeta.pill)}>
                  {platformMeta.icon} {prompt.platform}
                </span>
                <span className="text-[10px] text-ink-400">{timeAgo(prompt.created_at)}</span>
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <Globe size={9} /> Public
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 active:bg-ink-300 flex items-center justify-center text-ink-600 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ overflowY: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {/* ── Images: horizontal scroll with nav arrows ── */}
          {images.length > 0 && (
            <div className="relative pt-4">
              {/* Scroll container */}
              <div
                ref={imageScrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-5 pb-2"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={() => {
                  const el = imageScrollRef.current;
                  if (!el) return;
                  const idx = Math.round(el.scrollLeft / el.clientWidth);
                  setActiveImage(Math.min(idx, images.length - 1));
                }}
              >
                {images.map((img) => (
                  <div key={img.id} className="flex-shrink-0 w-full snap-center rounded-2xl overflow-hidden bg-ink-100">
                    {urlsLoading ? (
                      <div className="w-full aspect-[4/3] animate-pulse bg-ink-200" />
                    ) : urls[img.id] ? (
                      <img
                        src={urls[img.id]}
                        alt={img.file_name}
                        className="w-full h-auto block"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center bg-ink-100">
                        <ImageIcon size={28} className="text-ink-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Left / Right arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const el = imageScrollRef.current;
                      if (!el) return;
                      const prev = Math.max(0, activeImage - 1);
                      el.scrollTo({ left: prev * el.clientWidth, behavior: 'smooth' });
                      setActiveImage(prev);
                    }}
                    className={cn(
                      'absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-ink-700 hover:bg-white transition-all active:scale-90',
                      activeImage === 0 && 'opacity-0 pointer-events-none',
                    )}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => {
                      const el = imageScrollRef.current;
                      if (!el) return;
                      const next = Math.min(images.length - 1, activeImage + 1);
                      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
                      setActiveImage(next);
                    }}
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-ink-700 hover:bg-white transition-all active:scale-90',
                      activeImage === images.length - 1 && 'opacity-0 pointer-events-none',
                    )}
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Dot indicators */}
                  <div className="flex justify-center gap-1.5 pt-2 pb-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const el = imageScrollRef.current;
                          if (!el) return;
                          el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
                          setActiveImage(i);
                        }}
                        className={cn(
                          'rounded-full transition-all duration-200',
                          i === activeImage
                            ? 'w-5 h-1.5 bg-ink-900'
                            : 'w-1.5 h-1.5 bg-ink-300 hover:bg-ink-400',
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className="px-5 pt-3 space-y-3">
              {videos.map((vid) => urls[vid.id] && (
                <video
                  key={vid.id}
                  src={urls[vid.id]}
                  controls
                  preload="metadata"
                  className="w-full rounded-2xl bg-black"
                />
              ))}
            </div>
          )}

          {/* ── Stats row ── */}
          <div className="flex items-center gap-5 px-5 pt-4 pb-1">
            <button
              onClick={handleLike}
              disabled={toggleLike.isPending}
              className={cn(
                'flex items-center gap-1.5 text-[13px] font-semibold transition-all active:scale-90',
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
              onClick={() => { setActiveTab('comments'); setTimeout(() => commentInputRef.current?.focus(), 60); }}
              className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-800 transition-colors"
            >
              <MessageCircle size={15} />
              <span>{statsLoading ? '–' : formatCount(stats?.comment_count ?? 0)}</span>
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-ink-100 mx-5 mt-3">
            {(['prompt', 'comments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors relative',
                  activeTab === tab ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
                )}
              >
                {tab}
                {tab === 'comments' && (stats?.comment_count ?? 0) > 0 && (
                  <span className="ml-1 text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded-full">
                    {stats!.comment_count}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-900 rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="px-5 py-4">
            {activeTab === 'prompt' ? (
              <div className="space-y-4 pb-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Prompt</span>
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
                        <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-ink-100 text-ink-600 border border-ink-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {prompt.notes && (
                  <div className="border-l-2 border-ink-200 pl-3.5">
                    <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider block mb-1">Notes</span>
                    <p className="text-[12px] text-ink-600 leading-relaxed italic">{prompt.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-ink-400 pt-1 border-t border-ink-100">
                  <span>{new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
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
            )}
          </div>
        </div>

        {/* ── Sticky footer ── */}
        <div
          className="flex-shrink-0 border-t border-ink-100 bg-white px-4 sm:px-5 pt-3 pb-4 space-y-2.5 rounded-b-none"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {/* Comment input */}
          <form onSubmit={handleComment} className="flex items-end gap-2">
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e); } }}
              placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
              disabled={!user || addComment.isPending}
              rows={1}
              className="flex-1 resize-none text-[13px] border border-ink-200 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 placeholder:text-ink-400 text-ink-900 bg-ink-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
              style={{ maxHeight: 80, overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={!user || !commentText.trim() || addComment.isPending}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-700 active:scale-95 transition-all"
            >
              <Send size={14} />
            </button>
          </form>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-200 active:scale-[0.98]',
              copied
                ? 'bg-green-500 text-white shadow-lg shadow-green-200/60'
                : 'bg-ink-900 text-white hover:bg-ink-800 shadow-lg shadow-ink-900/15',
            )}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
        </div>
      </motion.div>
      </div>
    </>
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
