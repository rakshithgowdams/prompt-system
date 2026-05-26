import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCourse, useCourseSections, useCourseLessons,
  useEnrollment, useEnroll, useCourseProgress,
  useMarkLessonComplete, useSaveWatchPosition,
  useLessonNotes, useCreateNote, useUpdateNote, useDeleteNote,
  useMyCertificate,
} from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import type { CourseLesson } from '../hooks/useCourses';

// ── Video embed helpers ───────────────────────────────────────────────────────

const YOUTUBE_EMBED = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
};
const VIMEO_EMBED = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
};

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 40, stroke = 3.5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#A435F0" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

// ── Notes panel ───────────────────────────────────────────────────────────────

function NotesPanel({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { data: notes = [] } = useLessonNotes(courseId, lessonId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleCreate = async () => {
    if (!draft.trim()) return;
    await createNote.mutateAsync({ courseId, lessonId, content: draft.trim() });
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-ink-300 flex-shrink-0">
        <h3 className="text-sm font-display font-bold text-ink-900 mb-3">Lesson Notes</h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleCreate(); }}
          rows={3}
          placeholder="Write a note… (Ctrl+Enter to save)"
          className="w-full px-3 py-2.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-xs placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
        />
        <button
          onClick={handleCreate}
          disabled={!draft.trim() || createNote.isPending}
          className="mt-2.5 w-full h-9 rounded-xl bg-ink-900 hover:bg-brand-400 disabled:opacity-40 text-white text-xs font-bold transition-colors"
        >
          Save Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {notes.length === 0 ? (
          <div className="text-center py-10">
            <Icon name="edit_note" size={28} className="text-ink-300 mx-auto mb-2" />
            <p className="text-xs text-ink-500 italic">No notes for this lesson yet.</p>
          </div>
        ) : notes.map((note) => (
          <div key={note.id} className="bg-ink-100 border border-ink-300 rounded-xl p-3.5">
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-2.5 py-2 rounded-lg bg-white border border-ink-300 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={async () => { await updateNote.mutateAsync({ id: note.id, content: editContent, courseId }); setEditingId(null); }}
                    className="flex-1 h-7 rounded-lg bg-ink-900 text-white text-xs font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)}
                    className="flex-1 h-7 rounded-lg border border-ink-300 text-ink-500 text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-end gap-1 mt-2.5 pt-2 border-t border-ink-300">
                  <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                    className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors rounded-md hover:bg-white">
                    <Icon name="edit" size={12} />
                  </button>
                  <button onClick={() => deleteNote.mutate({ id: note.id, courseId })}
                    className="p-1.5 text-ink-400 hover:text-danger transition-colors rounded-md hover:bg-red-50">
                    <Icon name="delete" size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Resource downloads ────────────────────────────────────────────────────────

function ResourceList({ lesson }: { lesson: CourseLesson }) {
  const handleDownload = async (res: { name: string; path: string }) => {
    try {
      const { data } = await supabase.storage.from('prompt-media').createSignedUrl(res.path, 60);
      if (!data?.signedUrl) throw new Error();
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = res.name;
      a.click();
    } catch { toast.error('Download failed'); }
  };

  if (!lesson.resources?.length) {
    return (
      <div className="text-center py-10 px-4 bg-white h-full">
        <Icon name="attach_file" size={28} className="text-ink-300 mx-auto mb-2" />
        <p className="text-xs text-ink-500 italic">No resources for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 bg-white h-full">
      {lesson.resources.map((res, i) => (
        <button key={i} onClick={() => handleDownload(res)}
          className="w-full flex items-center gap-3 p-3.5 bg-ink-100 hover:bg-ink-200 border border-ink-300 rounded-xl transition-colors text-left group">
          <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="download" size={16} className="text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate group-hover:text-brand-600">{res.name}</p>
            {res.size && <p className="text-xs text-ink-500">{(res.size / 1024 / 1024).toFixed(1)} MB</p>}
          </div>
          <Icon name="download" size={14} className="text-ink-400 group-hover:text-brand-500 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ── Lesson type icon ──────────────────────────────────────────────────────────

function lessonIcon(type: string) {
  switch (type) {
    case 'video': return 'play_circle';
    case 'image': return 'image';
    case 'text': return 'article';
    default: return 'folder_zip';
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: course } = useCourse(courseId ?? '');
  const { data: sections = [] } = useCourseSections(courseId ?? '');
  const { data: lessons = [] } = useCourseLessons(courseId ?? '');
  const { data: enrollment } = useEnrollment(courseId ?? '');
  const { data: progressList = [] } = useCourseProgress(courseId ?? '');
  const { data: certificate } = useMyCertificate(courseId ?? '');

  const enroll = useEnroll();
  const markComplete = useMarkLessonComplete();
  const savePosition = useSaveWatchPosition();

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<'notes' | 'resources' | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const completedIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lesson_id));
  const pct = lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0;
  const isOwner = course?.user_id === user?.id;
  const isCompleted = activeLesson ? completedIds.has(activeLesson.id) : false;
  const canAccess = isOwner || !!enrollment || activeLesson?.is_preview;

  useEffect(() => {
    if (!activeLessonId && lessons.length > 0) {
      setActiveLessonId(lessons[0].id);
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [lessons.length]);

  useEffect(() => {
    setVideoUrl(null);
    if (!activeLesson) return;
    if (activeLesson.video_path) {
      setMediaLoading(true);
      supabase.storage.from('prompt-media').createSignedUrl(activeLesson.video_path, 3600)
        .then(({ data }) => setVideoUrl(data?.signedUrl ?? null))
        .catch(() => {})
        .finally(() => setMediaLoading(false));
    } else if (activeLesson.video_url) {
      setVideoUrl(activeLesson.video_url);
    }
  }, [activeLesson?.id]);

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      await enroll.mutateAsync(courseId);
      toast.success('Enrolled successfully!');
    } catch { toast.error('Enrollment failed'); }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !courseId) return;
    const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    await markComplete.mutateAsync({ lessonId: activeLesson.id, courseId, watchPositionSeconds: pos });
    toast.success('Lesson marked complete!');
    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
    if (idx < lessons.length - 1) setActiveLessonId(lessons[idx + 1].id);
  };

  const handleVideoTimeUpdate = useCallback(() => {
    if (!videoRef.current || !activeLesson || !courseId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePosition.mutate({ lessonId: activeLesson.id, courseId, seconds: Math.floor(videoRef.current!.currentTime) });
    }, 5000);
  }, [activeLesson?.id, courseId]);

  const getEmbedUrl = (url: string) => YOUTUBE_EMBED(url) || VIMEO_EMBED(url) || null;

  const toggleSection = (id: string) =>
    setExpandedSections((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectLesson = (id: string) => {
    setActiveLessonId(id);
    setMobileSidebarOpen(false);
  };

  if (!course) return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Lesson sidebar content (shared desktop + mobile) ──────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Progress header */}
      <div className="px-4 py-4 border-b border-ink-300 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <ProgressRing pct={pct} size={44} stroke={4} />
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-ink-900">{pct}% Complete</p>
            <p className="text-xs text-ink-500">{completedIds.size} of {lessons.length} lessons</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Course title */}
      <div className="px-4 py-3 border-b border-ink-300 flex-shrink-0">
        <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-0.5">Course</p>
        <p className="text-sm font-display font-bold text-ink-900 leading-snug line-clamp-2">{course.title}</p>
      </div>

      {/* Sections & lessons */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section, si) => {
          const sLessons = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.position - b.position);
          const isExpanded = expandedSections.has(section.id);
          const sCompleted = sLessons.filter((l) => completedIds.has(l.id)).length;
          return (
            <div key={section.id} className={cn('border-b border-ink-300', si === 0 && 'border-t')}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-ink-100 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink-900 leading-snug line-clamp-1">{section.title}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{sCompleted}/{sLessons.length} completed</p>
                </div>
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.18 }} className="inline-flex text-ink-500 flex-shrink-0">
                  <Icon name="expand_more" size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.18 }} className="overflow-hidden bg-ink-100"
                  >
                    {sLessons.map((lesson, li) => {
                      const done = completedIds.has(lesson.id);
                      const active = activeLessonId === lesson.id;
                      const accessible = isOwner || !!enrollment || lesson.is_preview;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => accessible && selectLesson(lesson.id)}
                          disabled={!accessible}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-ink-300/60',
                            active
                              ? 'bg-brand-50 border-l-2 border-l-brand-400'
                              : 'hover:bg-white',
                            !accessible && 'opacity-40 cursor-not-allowed',
                          )}
                        >
                          {/* Lesson number / completion indicator */}
                          <div className="flex-shrink-0 mt-0.5">
                            {done ? (
                              <div className="w-6 h-6 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
                                <Icon name="check" size={11} className="text-success" />
                              </div>
                            ) : (
                              <div className={cn(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold',
                                active ? 'border-brand-400 bg-brand-50 text-brand-500' : 'border-ink-300 text-ink-500'
                              )}>
                                {li + 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs font-semibold leading-snug line-clamp-2',
                              active ? 'text-brand-600' : done ? 'text-ink-500' : 'text-ink-900'
                            )}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-medium',
                                active ? 'text-brand-500' : 'text-ink-500'
                              )}>
                                <Icon name={lessonIcon(lesson.lesson_type)} size={10} />
                                {lesson.lesson_type}
                              </span>
                              {lesson.video_duration_minutes > 0 && (
                                <span className="text-[10px] text-ink-400">{lesson.video_duration_minutes}m</span>
                              )}
                              {lesson.is_preview && !enrollment && (
                                <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">FREE</span>
                              )}
                              {!accessible && <Icon name="lock" size={10} className="text-ink-400" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Back to courses link */}
      <div className="px-4 py-3 border-t border-ink-300 flex-shrink-0">
        <Link
          to="/courses"
          className="flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors"
        >
          <Icon name="arrow_back" size={14} />
          Back to all courses
        </Link>
      </div>
    </div>
  );

  return (
    // Standalone layout — no AppShell, no dashboard sidebar
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 sm:px-5 h-14 bg-white border-b border-ink-300 flex-shrink-0 sticky top-0 z-30">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/aiwithrakshith-tech-logo copy.png" alt="aiwithrakshith" className="h-7 w-7 object-contain" />
          <span className="hidden sm:block font-display font-black text-ink-900 tracking-tight text-[13px]">aiwithrakshith</span>
        </Link>

        <div className="w-px h-5 bg-ink-300 flex-shrink-0" />

        {/* Course title + progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold text-ink-900 truncate leading-tight">{course.title}</p>
          {enrollment && (
            <div className="hidden sm:flex items-center gap-2 mt-0.5">
              <div className="h-1 w-28 bg-ink-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-ink-500 font-medium">{pct}%</span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {certificate && (
            <button
              onClick={() => navigate(`/courses/${courseId}/certificate`)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <Icon name="workspace_premium" size={14} fill />
              Certificate
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => navigate(`/courses/${courseId}/edit`)}
              className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
              title="Edit course"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {/* Desktop: toggle lesson sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
            title={sidebarOpen ? 'Hide lessons' : 'Show lessons'}
          >
            <Icon name={sidebarOpen ? 'menu_open' : 'menu'} size={20} />
          </button>
          {/* Mobile: open lessons drawer */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
            title="Show lessons"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop lesson sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex flex-shrink-0 border-r border-ink-300 overflow-hidden"
            >
              <div className="w-[300px] h-full flex flex-col">
                <SidebarContent />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile lessons drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                className="fixed inset-y-0 left-0 w-[300px] z-50 border-r border-ink-300 shadow-2xl lg:hidden overflow-hidden"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ink-300 bg-white flex-shrink-0">
                    <p className="text-sm font-display font-bold text-ink-900">Lessons</p>
                    <button
                      onClick={() => setMobileSidebarOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition-colors"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <SidebarContent />
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main content area ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ink-100">

          {/* Enrollment banner */}
          {!enrollment && !isOwner && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-brand-50 border-b border-brand-100 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="school" size={16} className="text-brand-500 flex-shrink-0" />
                <p className="text-sm text-brand-800 font-medium truncate">
                  Enroll for free to unlock all lessons and track your progress.
                </p>
              </div>
              <Button size="sm" onClick={handleEnroll} loading={enroll.isPending} className="flex-shrink-0">
                Enroll Free
              </Button>
            </div>
          )}

          {activeLesson && canAccess ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* Lesson content */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

                {/* ── Video / content viewer ── */}
                <div className="flex-shrink-0 bg-ink-900">
                  {activeLesson.lesson_type === 'video' && videoUrl && (
                    getEmbedUrl(videoUrl) ? (
                      <div className="relative aspect-video">
                        <iframe
                          src={getEmbedUrl(videoUrl)!}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={activeLesson.title}
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-black">
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          controls
                          className="w-full h-full"
                          onTimeUpdate={handleVideoTimeUpdate}
                        />
                      </div>
                    )
                  )}

                  {activeLesson.lesson_type === 'video' && !videoUrl && (
                    <div className="aspect-video relative overflow-hidden bg-ink-900">
                      {mediaLoading ? (
                        <div className="absolute inset-0 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[skeleton-sweep_1.8s_ease-in-out_infinite]">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon name="play_circle" size={48} className="text-ink-600" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {activeLesson.lesson_type === 'image' && (
                  <div className="p-4 sm:p-6 bg-white flex-shrink-0">
                    {mediaLoading ? (
                      <div className="rounded-2xl overflow-hidden border border-ink-300 min-h-[200px] relative bg-ink-200 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[skeleton-sweep_1.8s_ease-in-out_infinite]" />
                    ) : videoUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-ink-300 bg-ink-100 flex items-center justify-center">
                        <img src={videoUrl} alt={activeLesson.title} className="w-full object-contain max-h-[70vh]" />
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden border border-ink-300 bg-ink-100 flex items-center justify-center min-h-[200px]">
                        <Icon name="image" size={48} className="text-ink-300" />
                      </div>
                    )}
                  </div>
                )}

                {activeLesson.lesson_type === 'text' && activeLesson.content && (
                  <div className="p-4 sm:p-6 lg:p-8 flex-shrink-0">
                    <div className="max-w-3xl mx-auto bg-white border border-ink-300 rounded-2xl p-6 sm:p-8">
                      <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap font-sans">
                        {activeLesson.content}
                      </p>
                    </div>
                  </div>
                )}

                {activeLesson.lesson_type === 'resource' && (
                  <div className="p-4 sm:p-6 flex-shrink-0">
                    <div className="max-w-sm mx-auto bg-white border border-ink-300 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center">
                        <Icon name="folder_zip" size={32} className="text-brand-400" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink-900 mb-1">Downloadable Resources</p>
                        <p className="text-sm text-ink-500">Open the Resources tab below to download files for this lesson.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Lesson info + actions ── */}
                <div className="flex-shrink-0 bg-white border-b border-ink-300 px-4 sm:px-6 py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap max-w-4xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                          activeLesson.lesson_type === 'video' ? 'bg-brand-50 text-brand-600 border-brand-200' :
                          activeLesson.lesson_type === 'text' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-ink-100 text-ink-600 border-ink-300'
                        )}>
                          <Icon name={lessonIcon(activeLesson.lesson_type)} size={10} />
                          {activeLesson.lesson_type.charAt(0).toUpperCase() + activeLesson.lesson_type.slice(1)}
                        </span>
                        {activeLesson.video_duration_minutes > 0 && (
                          <span className="text-xs text-ink-500">{activeLesson.video_duration_minutes} min</span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-display font-extrabold text-ink-900 tracking-tight leading-tight mb-1">
                        {activeLesson.title}
                      </h2>
                      {activeLesson.description && (
                        <p className="text-sm text-ink-500 leading-relaxed mt-1">{activeLesson.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-success border border-green-200 text-sm font-semibold">
                          <Icon name="check_circle" size={16} fill />
                          Completed
                        </div>
                      ) : (enrollment || isOwner) ? (
                        <Button onClick={handleMarkComplete} loading={markComplete.isPending}>
                          <Icon name="check_circle" size={15} />
                          Mark Complete
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Notes / Resources tabs */}
                  <div className="flex items-center gap-1.5 mt-4">
                    {([
                      ['notes', 'edit_note', 'Notes'] as const,
                      ['resources', 'attach_file', 'Resources'] as const,
                    ]).map(([key, icon, label]) => (
                      <button
                        key={key}
                        onClick={() => setRightPanel(rightPanel === key ? null : key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150',
                          rightPanel === key
                            ? 'bg-ink-900 text-white border-ink-900'
                            : 'text-ink-600 border-ink-300 bg-white hover:border-ink-700 hover:text-ink-900'
                        )}
                      >
                        <Icon name={icon} size={13} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline panel for mobile */}
                <AnimatePresence>
                  {rightPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden lg:hidden border-b border-ink-300 max-h-80 overflow-y-auto bg-white"
                    >
                      {rightPanel === 'notes'
                        ? <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                        : <ResourceList lesson={activeLesson} />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Prev / Next navigation ── */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-5 bg-white mt-0.5">
                  {(() => {
                    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
                    const prev = idx > 0 ? lessons[idx - 1] : null;
                    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
                    return (
                      <div className="flex items-center justify-between gap-3 max-w-4xl">
                        <button
                          onClick={() => prev && setActiveLessonId(prev.id)}
                          disabled={!prev}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-300 text-ink-600 hover:text-ink-900 hover:border-ink-700 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                        >
                          <Icon name="chevron_left" size={16} />
                          Previous
                        </button>

                        {/* Lesson position indicator */}
                        <span className="text-xs text-ink-500 hidden sm:block">
                          {idx + 1} / {lessons.length}
                        </span>

                        {next ? (
                          <button
                            onClick={() => setActiveLessonId(next.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
                          >
                            Next
                            <Icon name="chevron_right" size={16} />
                          </button>
                        ) : certificate ? (
                          <button
                            onClick={() => navigate(`/courses/${courseId}/certificate`)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold hover:bg-amber-100 transition-colors"
                          >
                            <Icon name="workspace_premium" size={16} fill />
                            Get Certificate
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-success font-semibold">
                            <Icon name="flag" size={14} className="text-success" />
                            Course complete!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Desktop right panel: Notes / Resources */}
              <AnimatePresence initial={false}>
                {rightPanel && (
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: 320 }} exit={{ width: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:flex flex-shrink-0 border-l border-ink-300 flex-col overflow-hidden"
                  >
                    <div className="w-[320px] h-full flex flex-col">
                      {/* Panel tab header */}
                      <div className="flex border-b border-ink-300 bg-white flex-shrink-0">
                        {([['notes', 'Notes'] as const, ['resources', 'Resources'] as const]).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setRightPanel(key)}
                            className={cn(
                              'flex-1 py-3 text-xs font-bold border-b-2 transition-colors',
                              rightPanel === key
                                ? 'text-brand-500 border-brand-400'
                                : 'text-ink-500 border-transparent hover:text-ink-900'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          onClick={() => setRightPanel(null)}
                          className="px-3 text-ink-400 hover:text-ink-900 transition-colors border-b-2 border-transparent"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {rightPanel === 'notes'
                          ? <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                          : <ResourceList lesson={activeLesson} />}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* No lesson selected or no access */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center bg-ink-100">
              <div className="w-20 h-20 bg-white border border-ink-300 rounded-2xl flex items-center justify-center shadow-sm">
                <Icon name={!enrollment && !isOwner ? 'lock' : 'school'} size={36} className="text-ink-400" />
              </div>
              <div>
                <h3 className="text-xl font-display font-extrabold text-ink-900 mb-2">
                  {!enrollment && !isOwner ? 'Enroll to start learning' : 'Select a lesson to begin'}
                </h3>
                <p className="text-sm text-ink-500 max-w-xs mx-auto leading-relaxed">
                  {!enrollment && !isOwner
                    ? 'This course is free. Enroll to unlock all content and track your progress.'
                    : 'Choose a lesson from the sidebar on the left.'}
                </p>
              </div>
              {!enrollment && !isOwner && (
                <Button onClick={handleEnroll} loading={enroll.isPending} size="lg">
                  <Icon name="school" size={16} />
                  Enroll Now — Free
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
