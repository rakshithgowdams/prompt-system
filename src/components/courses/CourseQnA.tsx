import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCourseQuestions, useCourseAnswers, useAskQuestion, usePostAnswer,
  useToggleVote, useDeleteQuestion, useDeleteAnswer, useToggleResolved,
  type CourseQuestion,
} from '../../hooks/useCourses';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../ui/Icon';

interface Props {
  courseId: string;
  courseOwnerId: string;
  isEnrolled: boolean;
  activeLessonId?: string | null;
}

export function CourseQnA({ courseId, courseOwnerId, isEnrolled, activeLessonId }: Props) {
  const { user } = useAuth();
  const isOwner = user?.id === courseOwnerId;
  const canPost = isEnrolled || isOwner;

  const [sort, setSort] = useState<'recent' | 'unanswered' | 'top'>('recent');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: questions = [], isLoading } = useCourseQuestions(courseId, { sort, search });

  return (
    <div className="bg-white rounded-2xl border border-ink-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-display font-bold text-ink-900">Q&amp;A</h3>
          <p className="text-xs text-ink-500 mt-0.5">Ask a question, help others by answering.</p>
        </div>
        {canPost && (
          <button
            onClick={() => setComposerOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 bg-ink-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-ink-700 transition-colors"
          >
            <Icon name={composerOpen ? 'close' : 'add'} size={14} />
            {composerOpen ? 'Cancel' : 'Ask a question'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {composerOpen && (
          <QuestionComposer
            courseId={courseId}
            lessonId={activeLessonId ?? null}
            onPosted={() => setComposerOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-ink-100 rounded-lg p-1 gap-0.5">
          {(['recent', 'unanswered', 'top'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                sort === opt ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {opt === 'recent' ? 'Recent' : opt === 'unanswered' ? 'Unanswered' : 'Top'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-ink-50 border border-ink-200 rounded-lg focus:border-ink-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-ink-50 border border-ink-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-12 h-12 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="forum" size={20} className="text-ink-400" />
          </div>
          <p className="text-sm font-semibold text-ink-900">No questions yet</p>
          <p className="text-xs text-ink-500 mt-1">
            {canPost ? 'Be the first to ask one.' : 'Enroll to post a question.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionItem key={q.id} question={q} courseId={courseId} isOwner={isOwner} canPost={canPost} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionComposer({
  courseId, lessonId, onPosted,
}: {
  courseId: string;
  lessonId: string | null;
  onPosted: () => void;
}) {
  const ask = useAskQuestion();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (title.trim().length < 5) { toast.error('Title must be at least 5 characters'); return; }
    if (body.trim().length < 10) { toast.error('Question body must be at least 10 characters'); return; }
    try {
      await ask.mutateAsync({ course_id: courseId, lesson_id: lessonId, title, body });
      toast.success('Question posted!');
      setTitle(''); setBody(''); onPosted();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to post question');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Question title (5–200 characters)"
          maxLength={200}
          className="w-full px-3 py-2 text-sm font-semibold bg-white border border-ink-200 rounded-lg focus:border-ink-400 focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe your question with as much detail as possible..."
          rows={4}
          maxLength={5000}
          className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:border-ink-400 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-500">{body.length}/5000</span>
          <button
            onClick={submit}
            disabled={ask.isPending}
            className="bg-ink-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-ink-700 disabled:opacity-50 transition-colors"
          >
            {ask.isPending ? 'Posting…' : 'Post question'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuestionItem({
  question, courseId, isOwner, canPost,
}: {
  question: CourseQuestion;
  courseId: string;
  isOwner: boolean;
  canPost: boolean;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const toggleVote = useToggleVote();
  const deleteQ = useDeleteQuestion();
  const resolveQ = useToggleResolved();

  const isAuthor = user?.id === question.user_id;
  const timeAgo = formatRelativeTime(question.created_at);

  return (
    <div className={`border rounded-xl p-4 transition-colors ${question.is_resolved ? 'bg-green-50/40 border-green-200' : 'bg-white border-ink-200'}`}>
      <div className="flex items-start gap-3">
        <QnAAvatar name={question.author_name ?? 'S'} src={question.author_avatar} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-ink-900">{question.author_name}</span>
            <span className="text-[11px] text-ink-500">{timeAgo}</span>
            {question.is_resolved && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Icon name="check_circle" size={10} fill /> RESOLVED
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-ink-900 leading-snug">{question.title}</h4>
          <p className="text-xs text-ink-700 mt-1 line-clamp-3 whitespace-pre-wrap leading-relaxed">{question.body}</p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={() => user && toggleVote.mutate({ target_type: 'question', target_id: question.id, voted: !!question.user_has_voted })}
              className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                question.user_has_voted ? 'text-emerald-600' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <Icon name="arrow_upward" size={14} />
              {question.upvote_count}
            </button>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              <Icon name="chat_bubble_outline" size={14} />
              {question.answer_count} {question.answer_count === 1 ? 'answer' : 'answers'}
            </button>
            {isOwner && (
              <button
                onClick={() => resolveQ.mutate({ id: question.id, course_id: courseId, is_resolved: !question.is_resolved })}
                className="text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                {question.is_resolved ? 'Reopen' : 'Mark resolved'}
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => { if (confirm('Delete this question?')) deleteQ.mutate({ id: question.id, course_id: courseId }); }}
                className="text-xs font-semibold text-red-500 hover:text-red-700 ml-auto"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 pt-4 border-t border-ink-200"
          >
            <AnswersThread questionId={question.id} courseId={courseId} canPost={canPost} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnswersThread({
  questionId, courseId, canPost,
}: {
  questionId: string;
  courseId: string;
  canPost: boolean;
}) {
  const { user } = useAuth();
  const { data: answers = [], isLoading } = useCourseAnswers(questionId);
  const postAnswer = usePostAnswer();
  const toggleVote = useToggleVote();
  const deleteA = useDeleteAnswer();
  const [body, setBody] = useState('');

  const submit = async () => {
    if (!body.trim()) return;
    try {
      await postAnswer.mutateAsync({ question_id: questionId, course_id: courseId, body });
      setBody('');
      toast.success('Answer posted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to post answer');
    }
  };

  return (
    <div className="space-y-3 pl-1">
      {isLoading && <div className="h-14 bg-ink-50 rounded-lg animate-pulse" />}
      {answers.map((a) => {
        const isAuthor = user?.id === a.user_id;
        return (
          <div key={a.id} className={`p-3 rounded-lg ${a.is_instructor ? 'bg-blue-50/60 border border-blue-200' : 'bg-ink-50'}`}>
            <div className="flex items-start gap-2.5">
              <QnAAvatar name={a.author_name ?? 'S'} src={a.author_avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-ink-900">{a.author_name}</span>
                  {a.is_instructor && (
                    <span className="inline-flex items-center bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      INSTRUCTOR
                    </span>
                  )}
                  <span className="text-[10px] text-ink-500">{formatRelativeTime(a.created_at)}</span>
                </div>
                <p className="text-xs text-ink-800 mt-1 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => user && toggleVote.mutate({ target_type: 'answer', target_id: a.id, voted: !!a.user_has_voted })}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      a.user_has_voted ? 'text-emerald-600' : 'text-ink-500 hover:text-ink-900'
                    }`}
                  >
                    <Icon name="arrow_upward" size={12} />
                    {a.upvote_count}
                  </button>
                  {isAuthor && (
                    <button
                      onClick={() => { if (confirm('Delete this answer?')) deleteA.mutate({ id: a.id, question_id: questionId, course_id: courseId }); }}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {canPost && (
        <div className="space-y-2 pt-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your answer..."
            rows={3}
            maxLength={5000}
            className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg focus:border-ink-400 focus:outline-none resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={postAnswer.isPending || !body.trim()}
              className="bg-ink-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-ink-700 disabled:opacity-50 transition-colors"
            >
              {postAnswer.isPending ? 'Posting…' : 'Post answer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QnAAvatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const initials = (name ?? 'S').split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0 border border-ink-200`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-ink-100 border border-ink-200 flex items-center justify-center font-bold text-ink-700 flex-shrink-0`}>
      {initials}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
