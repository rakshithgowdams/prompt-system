import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useCourseReviews, useMyReview, useSubmitReview, useDeleteMyReview, useInstructorRespond,
  type CourseReview,
} from '../../hooks/useCourses';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icon';

interface Props {
  courseId: string;
  courseOwnerId: string;
  isEnrolled: boolean;
  avgRating: number;
  reviewsCount: number;
}

export function CourseReviews({ courseId, courseOwnerId, isEnrolled, avgRating, reviewsCount }: Props) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useCourseReviews(courseId);
  const { data: myReview } = useMyReview(courseId);
  const isOwner = user?.id === courseOwnerId;
  const canReview = !!user && !isOwner && isEnrolled;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="bg-white rounded-2xl border border-ink-200 p-5 space-y-5">
      {/* Aggregate header */}
      <div className="flex items-start gap-6 flex-wrap pb-4 border-b border-ink-200">
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <div className="text-5xl font-display font-extrabold text-ink-900 leading-none">
            {avgRating ? avgRating.toFixed(1) : '—'}
          </div>
          <StarRow rating={Math.round(avgRating)} size={16} />
          <div className="text-xs text-ink-500 mt-1">{reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'}</div>
        </div>
        <div className="flex-1 min-w-[180px] space-y-1.5">
          {distribution.map(({ star, count }) => {
            const pct = reviewsCount ? (count / reviewsCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="text-ink-500 w-3 text-right">{star}</span>
                <Icon name="star" size={12} fill className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-ink-500 w-5 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write / edit review */}
      {canReview && <ReviewComposer courseId={courseId} existing={myReview ?? null} />}

      {!user && (
        <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 text-center text-xs text-ink-500">
          Sign in to leave a review.
        </div>
      )}

      {user && !isEnrolled && !isOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-xs text-amber-800">
          Enroll in this course to leave a review.
        </div>
      )}

      {isOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-xs text-blue-800">
          As the course owner, you cannot review your own course — but you can respond to student reviews below.
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-4">
        <h4 className="text-sm font-display font-bold text-ink-900">Student reviews</h4>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-ink-50 rounded-xl animate-pulse" />)}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-ink-500 text-center py-6">No reviews yet. Be the first.</p>
        ) : (
          reviews.map((r) => (
            <ReviewItem key={r.id} review={r} courseId={courseId} isOwner={isOwner} />
          ))
        )}
      </div>
    </div>
  );
}

function ReviewComposer({ courseId, existing }: { courseId: string; existing: CourseReview | null }) {
  const submit = useSubmitReview();
  const del = useDeleteMyReview();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setTitle(existing.title ?? '');
      setBody(existing.body ?? '');
    }
  }, [existing?.id]);

  const handleSubmit = async () => {
    if (rating < 1) { toast.error('Please select a star rating'); return; }
    try {
      await submit.mutateAsync({ course_id: courseId, rating, title, body });
      toast.success(existing ? 'Review updated' : 'Review posted!');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit review');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your review? You can write a new one after.')) return;
    try {
      await del.mutateAsync(courseId);
      setRating(0); setTitle(''); setBody('');
      toast.success('Review deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete');
    }
  };

  return (
    <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-ink-900 mb-2">
          {existing ? 'Your review' : 'Write a review'}
          <span className="ml-2 text-[10px] font-normal text-ink-500">(one per student — edit anytime)</span>
        </p>
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <Icon
                name="star"
                size={28}
                fill
                className={(hovered || rating) >= star ? 'text-amber-400' : 'text-ink-200'}
              />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-xs font-semibold text-ink-700">{rating}/5</span>}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={120}
        className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg focus:border-ink-400 focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience (optional)"
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg focus:border-ink-400 focus:outline-none resize-y"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-500">{body.length}/1000</span>
        <div className="flex items-center gap-2">
          {existing && (
            <button
              onClick={handleDelete}
              disabled={del.isPending}
              className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5"
            >
              Delete review
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submit.isPending || rating < 1}
            className="bg-ink-900 text-white text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-ink-700 disabled:opacity-50 transition-colors"
          >
            {submit.isPending ? 'Saving…' : existing ? 'Update review' : 'Post review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ review, courseId, isOwner }: { review: CourseReview; courseId: string; isOwner: boolean }) {
  const respond = useInstructorRespond();
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState(review.instructor_response ?? '');

  const handleRespond = async () => {
    if (!response.trim()) return;
    try {
      await respond.mutateAsync({ review_id: review.id, course_id: courseId, response });
      toast.success('Response posted');
      setResponding(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to respond');
    }
  };

  return (
    <div className="border border-ink-200 rounded-xl p-4 bg-white">
      <div className="flex items-start gap-3">
        <ReviewAvatar name={review.author_name ?? 'S'} src={review.author_avatar} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-ink-900">{review.author_name}</span>
            <StarRow rating={review.rating} size={12} />
            <span className="text-[11px] text-ink-500">
              {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {review.title && <h5 className="text-sm font-bold text-ink-900 mb-1">{review.title}</h5>}
          {review.body && <p className="text-xs text-ink-700 whitespace-pre-wrap leading-relaxed">{review.body}</p>}

          {review.instructor_response && (
            <div className="mt-3 pl-3 border-l-2 border-blue-300 bg-blue-50/40 rounded-r-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-flex items-center bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  INSTRUCTOR
                </span>
                {review.instructor_responded_at && (
                  <span className="text-[10px] text-ink-500">
                    {new Date(review.instructor_responded_at).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-800 whitespace-pre-wrap leading-relaxed">{review.instructor_response}</p>
            </div>
          )}

          {isOwner && !review.instructor_response && !responding && (
            <button
              onClick={() => setResponding(true)}
              className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
            >
              Respond as instructor
            </button>
          )}
          {isOwner && responding && (
            <div className="mt-3 space-y-2">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your response..."
                rows={2}
                maxLength={1000}
                className="w-full px-2 py-1.5 text-xs bg-white border border-blue-200 rounded-md focus:border-blue-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setResponding(false)} className="text-[11px] text-ink-500 px-2 py-1">Cancel</button>
                <button
                  onClick={handleRespond}
                  disabled={respond.isPending || !response.trim()}
                  className="bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {respond.isPending ? 'Posting…' : 'Post response'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon key={s} name="star" size={size} fill className={s <= rating ? 'text-amber-400' : 'text-ink-200'} />
      ))}
    </div>
  );
}

function ReviewAvatar({ name, src }: { name: string; src?: string | null }) {
  const initials = (name ?? 'S').split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-ink-200" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-ink-100 border border-ink-200 flex items-center justify-center font-bold text-ink-700 text-xs flex-shrink-0">
      {initials}
    </div>
  );
}
