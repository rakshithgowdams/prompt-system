import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const YOUTUBE_EMBED = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
};
const VIMEO_EMBED = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700 border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-danger border-red-200',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface SharedLesson {
  id: string;
  section_id: string;
  title: string;
  description: string;
  lesson_type: 'video' | 'image' | 'text' | 'resource';
  video_url: string | null;
  video_path: string | null;
  signed_video_url: string | null;
  video_duration_minutes: number;
  content: string;
  position: number;
  is_preview: boolean;
}

interface SharedSection {
  id: string;
  title: string;
  position: number;
}

interface SharedCourse {
  id: string;
  title: string;
  description: string;
  short_description: string;
  cover_url: string | null;
  category: string;
  level: string;
  language: string;
  tags: string[];
  what_you_learn: string[];
  requirements: string[];
  total_duration_minutes: number;
}

type PageState =
  | { status: 'loading' }
  | { status: 'password_required'; shareId: string; shareName: string }
  | { status: 'ok'; share: { share_name: string; access_type: string; expires_at: string | null; view_count: number }; course: SharedCourse; sections: SharedSection[]; lessons: SharedLesson[] }
  | { status: 'error'; message: string };

// ── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ shareId, shareName, onUnlock }: { shareId: string; shareName: string; onUnlock: (hash: string) => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const hash = await sha256(password.trim());
      onUnlock(hash);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white border border-ink-300 rounded-lg overflow-hidden shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="p-7 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-md flex items-center justify-center mx-auto mb-4">
              <Icon name="lock" size={26} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-ink-900 tracking-tight mb-1">{shareName || 'Protected Course'}</h1>
            <p className="text-ink-500 text-sm mb-6">This course is password protected. Enter the password to access it.</p>

            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <div className="relative">
                <input
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  className={cn(
                    'w-full h-10 pl-3 pr-9 rounded-xl bg-ink-100 border text-ink-900 text-sm focus:outline-none focus:ring-2 transition-colors placeholder-ink-400',
                    error ? 'border-red-500/50 focus:ring-red-500/30' : 'border-ink-300 focus:ring-amber-300',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={14} />
                </button>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button type="submit" className="w-full" loading={loading} disabled={!password.trim()}>
                <Icon name="lock_open" size={14} />
                Unlock Course
              </Button>
            </form>
          </div>
        </div>
        <p className="text-center text-xs text-ink-400 mt-4">
          Shared via{' '}
          <a href="/" className="text-ink-500 hover:text-ink-700 transition-colors font-medium">aiwithrakshith.tech</a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Lesson preview player ─────────────────────────────────────────────────────

function LessonPreview({ lesson }: { lesson: SharedLesson }) {
  const embedYT = lesson.video_url ? YOUTUBE_EMBED(lesson.video_url) : null;
  const embedVimeo = lesson.video_url ? VIMEO_EMBED(lesson.video_url) : null;

  return (
    <div className="space-y-3">
      {(embedYT || embedVimeo) && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedYT ?? embedVimeo!}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {!embedYT && !embedVimeo && lesson.signed_video_url && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <video src={lesson.signed_video_url} controls className="w-full h-full" />
        </div>
      )}
      {lesson.content && (
        <div className="prose prose-sm max-w-none text-ink-700 whitespace-pre-wrap text-sm leading-relaxed">
          {lesson.content}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CourseSharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [activeLesson, setActiveLesson] = useState<SharedLesson | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchShare = async (passwordHash?: string) => {
    if (!shareId) return;
    setState({ status: 'loading' });
    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/get-course-share?id=${shareId}`;
      const res = await fetch(apiUrl, {
        method: passwordHash ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'Apikey': ANON_KEY,
        },
        ...(passwordHash ? { body: JSON.stringify({ password_hash: passwordHash }) } : {}),
      });

      const data = await res.json();

      if (res.status === 404) { setState({ status: 'error', message: 'This share link does not exist or has been removed.' }); return; }
      if (res.status === 410) { setState({ status: 'error', message: 'This share link has expired.' }); return; }
      if (data.status === 'password_required') {
        setState({ status: 'password_required', shareId, shareName: data.share.share_name });
        return;
      }
      if (data.status === 'ok') {
        if (passwordHash && data.status === 'password_required') {
          setState((prev) => ({ ...prev as Extract<PageState, { status: 'password_required' }>, error: 'Incorrect password' }));
          return;
        }
        const previewLessons: SharedLesson[] = data.lessons.filter((l: SharedLesson) => l.is_preview);
        setState({ status: 'ok', share: data.share, course: data.course, sections: data.sections, lessons: data.lessons });
        setExpandedSections(new Set(data.sections.map((s: SharedSection) => s.id)));
        if (previewLessons.length > 0) setActiveLesson(previewLessons[0]);
      } else {
        setState({ status: 'error', message: 'Failed to load this course.' });
      }
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  useEffect(() => { fetchShare(); }, [shareId]);

  const handlePasswordUnlock = async (hash: string) => {
    // Optimistically try the hash — re-fetch with it
    setState({ status: 'loading' });
    if (!shareId) return;
    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/get-course-share?id=${shareId}`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', 'Apikey': ANON_KEY },
        body: JSON.stringify({ password_hash: hash }),
      });
      const data = await res.json();
      if (data.status === 'password_required') {
        setState({ status: 'password_required', shareId, shareName: data.share.share_name });
        // Show error — we need to signal wrong password
        setTimeout(() => {
          setState((prev) => {
            if (prev.status === 'password_required') return { ...prev };
            return prev;
          });
        }, 100);
        return;
      }
      if (data.status === 'ok') {
        const previewLessons: SharedLesson[] = data.lessons.filter((l: SharedLesson) => l.is_preview);
        setState({ status: 'ok', share: data.share, course: data.course, sections: data.sections, lessons: data.lessons });
        setExpandedSections(new Set(data.sections.map((s: SharedSection) => s.id)));
        if (previewLessons.length > 0) setActiveLesson(previewLessons[0]);
      }
    } catch {
      setState({ status: 'password_required', shareId, shareName: '' });
    }
  };

  // ── Loading ──
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="h-8 w-8 animate-spin text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-ink-500 text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  // ── Password gate ──
  if (state.status === 'password_required') {
    return <PasswordGate shareId={state.shareId} shareName={state.shareName} onUnlock={handlePasswordUnlock} />;
  }

  // ── Error ──
  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-ink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Icon name="link_off" size={28} className="text-ink-500" />
          </div>
          <h1 className="text-xl font-display font-bold text-ink-900 tracking-tight mb-2">Link Unavailable</h1>
          <p className="text-ink-500 text-sm mb-6">{state.message}</p>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-900 text-sm font-medium transition-colors">
            Go to aiwithrakshith.tech
          </button>
        </div>
      </div>
    );
  }

  // ── OK ──
  const { course, sections, lessons, share } = state;
  const previewLessons = lessons.filter((l) => l.is_preview);
  const totalLessons = lessons.length;

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-ink-300">
        <div className="flex items-center justify-between px-4 lg:px-8 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-400 rounded-md flex items-center justify-center flex-shrink-0">
              <Icon name="school" size={16} className="text-white" fill />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-ink-500">Shared course</span>
              <p className="text-sm font-semibold text-ink-900 truncate max-w-[200px] lg:max-w-xs">{course.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-ink-400">
              <Icon name="visibility" size={12} />
              {share.view_count} views
            </span>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-md bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
            >
              Sign up free
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 max-w-7xl mx-auto w-full">

        {/* ── Left: Course info + curriculum ── */}
        <div className={cn(
          'flex flex-col overflow-y-auto border-r border-ink-300',
          activeLesson ? 'hidden lg:flex lg:w-80 xl:w-96 flex-shrink-0' : 'flex-1',
        )}>

          {/* Hero */}
          <div className="relative">
            {course.cover_url ? (
              <div className="aspect-video overflow-hidden">
                <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center">
                <Icon name="school" size={48} className="text-ink-400" />
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', LEVEL_COLORS[course.level] ?? LEVEL_COLORS.beginner)}>
                {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-400 border border-brand-100">FREE</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 border border-ink-300">{course.category}</span>
            </div>

            {/* Title & description */}
            <div>
              <h1 className="text-xl font-display font-bold text-ink-900 tracking-tight leading-snug mb-2">{course.title}</h1>
              <p className="text-ink-500 text-sm leading-relaxed">{course.short_description || course.description}</p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-xs text-ink-500">
              <span className="flex items-center gap-1.5"><Icon name="menu_book" size={13} />{totalLessons} lessons</span>
              {course.total_duration_minutes > 0 && (
                <span className="flex items-center gap-1.5"><Icon name="schedule" size={13} />{course.total_duration_minutes}m total</span>
              )}
              <span className="flex items-center gap-1.5"><Icon name="language" size={13} />{course.language}</span>
            </div>

            {/* CTA */}
            <div className="bg-brand-50 border border-brand-100 rounded-md p-4 text-center">
              <p className="text-sm font-semibold text-ink-900 mb-1">Want full access?</p>
              <p className="text-xs text-ink-500 mb-3">Sign up free to enroll and track your progress.</p>
              <button
                onClick={() => navigate('/signup')}
                className="w-full h-9 rounded-md bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
              >
                Enroll for Free
              </button>
            </div>

            {/* What you'll learn */}
            {course.what_you_learn.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">What you'll learn</p>
                <ul className="space-y-1.5">
                  {course.what_you_learn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                      <Icon name="check_circle" size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" fill />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {course.requirements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">Requirements</p>
                <ul className="space-y-1.5">
                  {course.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                      <Icon name="arrow_right" size={14} className="text-ink-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Curriculum */}
            <div>
              <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">
                Curriculum · {previewLessons.length} free preview{previewLessons.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1.5">
                {sections.map((section) => {
                  const sectionLessons = lessons
                    .filter((l) => l.section_id === section.id)
                    .sort((a, b) => a.position - b.position);
                  const isExpanded = expandedSections.has(section.id);

                  return (
                    <div key={section.id} className="bg-white border border-ink-300 rounded-md overflow-hidden">
                      <button
                        onClick={() => setExpandedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                          return next;
                        })}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-ink-100 transition-colors"
                      >
                        <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="inline-flex text-ink-400">
                          <Icon name="chevron_right" size={15} />
                        </motion.span>
                        <span className="text-sm font-medium text-ink-900 flex-1">{section.title}</span>
                        <span className="text-[10px] text-ink-400">{sectionLessons.length}</span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            transition={{ duration: 0.2 }} className="overflow-hidden"
                          >
                            <div className="border-t border-ink-200 divide-y divide-ink-100">
                              {sectionLessons.map((lesson) => {
                                const isActive = activeLesson?.id === lesson.id;
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => lesson.is_preview ? setActiveLesson(lesson) : null}
                                    className={cn(
                                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                                      lesson.is_preview ? 'hover:bg-ink-100 cursor-pointer' : 'cursor-default opacity-60',
                                      isActive && 'bg-brand-50 border-l-2 border-l-brand-400',
                                    )}
                                  >
                                    <div className={cn(
                                      'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                                      lesson.is_preview
                                        ? lesson.lesson_type === 'video' ? 'bg-brand-50 text-brand-400'
                                          : lesson.lesson_type === 'image' ? 'bg-green-50 text-success'
                                          : lesson.lesson_type === 'text' ? 'bg-amber-50 text-amber-600'
                                          : 'bg-ink-200 text-ink-400'
                                        : 'bg-ink-100 text-ink-400',
                                    )}>
                                      <Icon
                                        name={
                                          !lesson.is_preview ? 'lock' :
                                          lesson.lesson_type === 'video' ? 'play_circle' :
                                          lesson.lesson_type === 'image' ? 'image' :
                                          lesson.lesson_type === 'text' ? 'article' : 'attach_file'
                                        }
                                        size={12}
                                        fill
                                      />
                                    </div>
                                    <span className="text-xs text-ink-700 truncate flex-1">{lesson.title}</span>
                                    {lesson.is_preview && (
                                      <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded flex-shrink-0">PREVIEW</span>
                                    )}
                                    {lesson.video_duration_minutes > 0 && (
                                      <span className="text-[10px] text-ink-400 flex-shrink-0">{lesson.video_duration_minutes}m</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ink-200 mt-auto">
            <p className="text-[11px] text-ink-400 text-center">
              Shared via{' '}
              <a href="/" className="text-ink-500 hover:text-ink-700 transition-colors font-medium">aiwithrakshith.tech</a>
              {' '}· Developed by{' '}
              <a
                href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400/70 hover:text-pink-300 font-semibold transition-colors"
              >
                @aiwithrakshith
              </a>
            </p>
          </div>
        </div>

        {/* ── Right: lesson player ── */}
        {activeLesson ? (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Mobile back button */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-ink-200 flex-shrink-0">
              <button
                onClick={() => setActiveLesson(null)}
                className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
              >
                <Icon name="arrow_back" size={16} />
                Back to course
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
                {/* Lesson header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded font-medium">Free Preview</span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-ink-900 tracking-tight">{activeLesson.title}</h2>
                  {activeLesson.description && (
                    <p className="text-ink-500 text-sm mt-1">{activeLesson.description}</p>
                  )}
                </div>

                {/* Player */}
                <LessonPreview lesson={activeLesson} />

                {/* Gate banner */}
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <Icon name="school" size={20} className="text-brand-400" fill />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink-900 mb-1">Enjoying this preview?</p>
                      <p className="text-sm text-ink-500 mb-3">Sign up free to unlock all lessons, track your progress, and earn a certificate.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate('/signup')}
                          className="px-4 py-2 rounded-md bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
                        >
                          Enroll for Free
                        </button>
                        <button
                          onClick={() => navigate('/login')}
                          className="px-4 py-2 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-900 text-sm font-medium transition-colors"
                        >
                          Sign in
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other preview lessons */}
                {previewLessons.length > 1 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">More free previews</p>
                    <div className="space-y-1.5">
                      {previewLessons.filter((l) => l.id !== activeLesson.id).map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-ink-50 border border-ink-300 hover:border-ink-500 rounded-md transition-colors text-left"
                        >
                          <div className="w-7 h-7 bg-brand-50 text-brand-400 rounded-md flex items-center justify-center flex-shrink-0">
                            <Icon name="play_circle" size={14} fill />
                          </div>
                          <span className="text-sm text-ink-700">{lesson.title}</span>
                          {lesson.video_duration_minutes > 0 && (
                            <span className="ml-auto text-xs text-ink-400">{lesson.video_duration_minutes}m</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // No lesson selected — show on mobile the full info (already rendered left panel becomes full width)
          null
        )}
      </div>
    </div>
  );
}
