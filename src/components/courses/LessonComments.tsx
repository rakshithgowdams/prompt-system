import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useLessonComments,
  useCreateLessonComment,
  useDeleteLessonComment,
  type LessonComment,
} from '../../hooks/useCourses';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHovered(s)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn('transition-transform', !readonly && 'hover:scale-110 cursor-pointer', readonly && 'cursor-default')}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={(hovered || value) >= s ? '#f59e0b' : '#E5E7EB'}
              stroke={(hovered || value) >= s ? '#f59e0b' : '#D1D5DB'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-violet-500'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  if (url) {
    return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', color)}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || '?'}
    </div>
  );
}

// ── Reply form ────────────────────────────────────────────────────────────────

function ReplyForm({
  lessonId,
  courseId,
  parentId,
  onDone,
}: {
  lessonId: string;
  courseId: string;
  parentId: string;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const create = useCreateLessonComment();

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ lesson_id: lessonId, course_id: courseId, content: trimmed, parent_id: parentId });
      setText('');
      onDone();
    } catch {
      toast.error('Failed to post reply');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 ml-10"
    >
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Write your reply…"
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-ink-300 bg-ink-50 text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={submit}
          disabled={!text.trim() || create.isPending}
          className="px-4 h-8 rounded-xl bg-ink-900 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-colors"
        >
          {create.isPending ? 'Posting…' : 'Post Reply'}
        </button>
        <button onClick={onDone} className="px-3 h-8 rounded-xl border border-ink-300 text-ink-500 text-xs hover:text-ink-900 transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Single comment card ───────────────────────────────────────────────────────

function CommentCard({
  comment,
  replies,
  lessonId,
  courseId,
  currentUserId,
  courseOwnerId,
}: {
  comment: LessonComment;
  replies: LessonComment[];
  lessonId: string;
  courseId: string;
  currentUserId: string;
  courseOwnerId: string;
}) {
  const [showReply, setShowReply] = useState(false);
  const deleteComment = useDeleteLessonComment();

  const displayName = comment.user_display_name
    || comment.user_id.slice(0, 8);
  const isOwn = comment.user_id === currentUserId;
  const isInstructorReply = comment.parent_id !== null && comment.user_id === courseOwnerId;
  const canReply = currentUserId === courseOwnerId && comment.parent_id === null;

  const ago = timeAgo(comment.created_at);

  return (
    <div className={cn('group', comment.parent_id && 'ml-10')}>
      <div className={cn(
        'flex gap-3 p-3.5 rounded-2xl border transition-colors',
        isInstructorReply
          ? 'bg-blue-50 border-blue-100'
          : 'bg-white border-ink-200 hover:border-ink-300',
      )}>
        <Avatar
          name={displayName}
          url={comment.user_avatar_url}
          size={comment.parent_id ? 28 : 34}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-ink-900 truncate">{displayName}</span>
            {isInstructorReply && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                <Icon name="school" size={9} />
                Instructor
              </span>
            )}
            {comment.rating !== null && comment.parent_id === null && (
              <StarRating value={comment.rating} readonly size={12} />
            )}
            <span className="text-[10px] text-ink-400 ml-auto flex-shrink-0">{ago}</span>
          </div>
          <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

          <div className="flex items-center gap-2 mt-2.5">
            {canReply && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                <Icon name="reply" size={12} />
                Reply
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => deleteComment.mutate({ id: comment.id, lessonId })}
                className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-red-500 font-medium transition-colors ml-auto opacity-0 group-hover:opacity-100"
              >
                <Icon name="delete" size={11} />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((r) => (
            <div key={r.id} className="ml-10">
              <div className={cn(
                'flex gap-3 p-3 rounded-2xl border',
                'bg-blue-50 border-blue-100',
              )}>
                <Avatar name={r.user_display_name || r.user_id.slice(0, 8)} url={r.user_avatar_url} size={26} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold text-ink-900">{r.user_display_name || r.user_id.slice(0, 8)}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                      <Icon name="school" size={9} />
                      Instructor
                    </span>
                    <span className="text-[10px] text-ink-400 ml-auto">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showReply && (
          <ReplyForm
            lessonId={lessonId}
            courseId={courseId}
            parentId={comment.id}
            onDone={() => setShowReply(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main LessonComments ───────────────────────────────────────────────────────

export function LessonComments({
  lessonId,
  courseId,
  courseOwnerId,
}: {
  lessonId: string;
  courseId: string;
  courseOwnerId: string;
}) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useLessonComments(lessonId);
  const create = useCreateLessonComment();

  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState(0);

  const topLevel = comments.filter((c) => c.parent_id === null);
  const getReplies = (id: string) => comments.filter((c) => c.parent_id === id);

  const totalRatings = topLevel.filter((c) => c.rating !== null);
  const avgRating = totalRatings.length
    ? totalRatings.reduce((s, c) => s + (c.rating ?? 0), 0) / totalRatings.length
    : 0;

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({
        lesson_id: lessonId,
        course_id: courseId,
        content: trimmed,
        rating: rating || null,
      });
      setDraft('');
      setRating(0);
      toast.success('Comment posted!');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-display font-extrabold text-ink-900">
            Lesson Discussion
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {topLevel.length} {topLevel.length === 1 ? 'comment' : 'comments'}
            {totalRatings.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                {avgRating.toFixed(1)} avg
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Compose box */}
      {user && (
        <div className="bg-ink-50 border border-ink-200 rounded-2xl p-4">
          <div className="flex gap-3">
            <Avatar name={user.email ?? 'U'} size={32} />
            <div className="flex-1 min-w-0">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Share your feedback, questions, or suggestions about this lesson…"
                className="w-full px-3 py-2.5 rounded-xl border border-ink-300 bg-white text-ink-900 text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500 font-medium">Rating:</span>
                  <StarRating value={rating} onChange={setRating} size={16} />
                  {rating > 0 && (
                    <button onClick={() => setRating(0)} className="text-[10px] text-ink-400 hover:text-ink-700 transition-colors">
                      clear
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!draft.trim() || create.isPending}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-ink-900 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                >
                  <Icon name="send" size={13} />
                  {create.isPending ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-ink-100 animate-pulse" />
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-10 bg-ink-50 rounded-2xl border border-dashed border-ink-300">
          <Icon name="chat_bubble_outline" size={28} className="text-ink-300 mx-auto mb-2" />
          <p className="text-sm text-ink-500 font-medium">No comments yet</p>
          <p className="text-xs text-ink-400 mt-1">Be the first to share your feedback!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              lessonId={lessonId}
              courseId={courseId}
              currentUserId={user?.id ?? ''}
              courseOwnerId={courseOwnerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
