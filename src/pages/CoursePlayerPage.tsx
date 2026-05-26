import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const YOUTUBE_EMBED = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
};
const VIMEO_EMBED = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
};

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 36, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#374151" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b82f6" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
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

  const handleUpdate = async (id: string) => {
    await updateNote.mutateAsync({ id, content: editContent, courseId });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white mb-2">Lesson Notes</h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleCreate(); }}
          rows={3}
          placeholder="Write a note... (Ctrl+Enter to save)"
          className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-xs placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleCreate}
          disabled={!draft.trim() || createNote.isPending}
          className="mt-2 w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
        >
          Save Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8 italic">No notes yet for this lesson</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                    className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-xs focus:outline-none resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(note.id)} className="flex-1 h-7 rounded-lg bg-blue-600 text-white text-xs font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 h-7 rounded-lg border border-gray-600 text-gray-400 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                      className="p-1 text-gray-600 hover:text-gray-300 transition-colors"><Icon name="edit" size={11} /></button>
                    <button onClick={() => deleteNote.mutate({ id: note.id, courseId })}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors"><Icon name="delete" size={11} /></button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
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

  if (!lesson.resources?.length) return <p className="text-xs text-gray-600 text-center py-6 italic">No resources for this lesson</p>;

  return (
    <div className="space-y-2 p-3">
      {lesson.resources.map((res, i) => (
        <button key={i} onClick={() => handleDownload(res)}
          className="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors text-left group">
          <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="download" size={14} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate group-hover:text-white">{res.name}</p>
            {res.size && <p className="text-xs text-gray-500">{(res.size / 1024 / 1024).toFixed(1)} MB</p>}
          </div>
          <Icon name="download" size={14} className="text-gray-600 group-hover:text-blue-400 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ── Main player ───────────────────────────────────────────────────────────────

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const completedIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lesson_id));
  const pct = lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0;
  const isOwner = course?.user_id === user?.id;

  // Auto-select first lesson
  useEffect(() => {
    if (!activeLessonId && lessons.length > 0) {
      setActiveLessonId(lessons[0].id);
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [lessons.length]);

  // Load signed video URL when switching lessons
  useEffect(() => {
    setVideoUrl(null);
    if (!activeLesson) return;
    if (activeLesson.video_path) {
      supabase.storage.from('prompt-media').createSignedUrl(activeLesson.video_path, 3600)
        .then(({ data }) => setVideoUrl(data?.signedUrl ?? null))
        .catch(() => {});
    } else if (activeLesson.video_url) {
      setVideoUrl(activeLesson.video_url);
    }
  }, [activeLesson?.id]);

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      await enroll.mutateAsync(courseId);
      toast.success('Enrolled!');
    } catch { toast.error('Enrollment failed'); }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !courseId) return;
    const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    await markComplete.mutateAsync({ lessonId: activeLesson.id, courseId, watchPositionSeconds: pos });
    toast.success('Lesson completed!');
    // Auto-advance to next lesson
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

  const isCompleted = activeLesson ? completedIds.has(activeLesson.id) : false;
  const canAccess = isOwner || !!enrollment || activeLesson?.is_preview;

  if (!course) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 flex-shrink-0 sticky top-0 z-20">
        <button onClick={() => navigate('/courses')} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0">
          <Icon name="arrow_back" size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{course.title}</h1>
          {enrollment && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1 w-24 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{pct}% complete</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {certificate && (
            <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 text-xs font-semibold hover:bg-amber-500/25 transition-colors">
              <Icon name="workspace_premium" size={14} fill />
              Certificate
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate(`/courses/${courseId}/edit`)}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <Icon name="edit" size={16} />
            </button>
          )}
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <Icon name="menu" size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Lesson sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-gray-900 border-r border-gray-800 overflow-hidden"
            >
              <div className="w-72 h-full flex flex-col">
                {/* Progress header */}
                <div className="p-4 border-b border-gray-800 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <ProgressRing pct={pct} size={40} stroke={4} />
                    <div>
                      <p className="text-xs font-semibold text-white">{pct}% Complete</p>
                      <p className="text-[11px] text-gray-500">{completedIds.size}/{lessons.length} lessons</p>
                    </div>
                  </div>
                </div>

                {/* Sections + lessons */}
                <div className="flex-1 overflow-y-auto">
                  {sections.map((section) => {
                    const sLessons = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.position - b.position);
                    const isExpanded = expandedSections.has(section.id);
                    const sCompleted = sLessons.filter((l) => completedIds.has(l.id)).length;
                    return (
                      <div key={section.id}>
                        <button
                          onClick={() => setExpandedSections((prev) => {
                            const next = new Set(prev);
                            if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                            return next;
                          })}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/40 transition-colors border-b border-gray-800/60"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-200 truncate">{section.title}</p>
                            <p className="text-[10px] text-gray-500">{sCompleted}/{sLessons.length} completed</p>
                          </div>
                          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }} className="inline-flex text-gray-500">
                            <Icon name="expand_more" size={16} />
                          </motion.span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              transition={{ duration: 0.15 }} className="overflow-hidden">
                              {sLessons.map((lesson) => {
                                const done = completedIds.has(lesson.id);
                                const active = activeLessonId === lesson.id;
                                const accessible = isOwner || !!enrollment || lesson.is_preview;
                                return (
                                  <button key={lesson.id}
                                    onClick={() => accessible && setActiveLessonId(lesson.id)}
                                    disabled={!accessible}
                                    className={cn(
                                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800/30',
                                      active ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/30',
                                      !accessible && 'opacity-50 cursor-not-allowed'
                                    )}>
                                    <div className="flex-shrink-0 mt-0.5">
                                      {done ? (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                          <Icon name="check" size={10} className="text-emerald-400" />
                                        </div>
                                      ) : (
                                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                          active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700')}>
                                          <Icon name={
                                            lesson.lesson_type === 'video' ? 'play_arrow' :
                                            lesson.lesson_type === 'image' ? 'image' :
                                            lesson.lesson_type === 'text' ? 'article' : 'attach_file'
                                          } size={9} className={active ? 'text-blue-400' : 'text-gray-600'} fill />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn('text-xs font-medium leading-snug truncate', active ? 'text-blue-200' : done ? 'text-gray-400' : 'text-gray-300')}>
                                        {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {lesson.video_duration_minutes > 0 && (
                                          <span className="text-[10px] text-gray-600">{lesson.video_duration_minutes}m</span>
                                        )}
                                        {lesson.is_preview && !enrollment && (
                                          <span className="text-[9px] text-teal-400">FREE PREVIEW</span>
                                        )}
                                        {!accessible && <Icon name="lock" size={9} className="text-gray-600" />}
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Enrollment gate */}
          {!enrollment && !isOwner && (
            <div className="bg-blue-600/10 border-b border-blue-500/20 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-blue-200 font-medium">Enroll for free to unlock all lessons and track your progress.</p>
              <Button size="sm" onClick={handleEnroll} loading={enroll.isPending}>
                <Icon name="school" size={13} />
                Enroll Free
              </Button>
            </div>
          )}

          {activeLesson && canAccess ? (
            <div className="flex flex-1 min-h-0">
              {/* Lesson viewer */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Video / Content */}
                <div className="flex-shrink-0">
                  {activeLesson.lesson_type === 'video' && videoUrl && (
                    getEmbedUrl(videoUrl) ? (
                      <div className="relative aspect-video bg-black">
                        <iframe src={getEmbedUrl(videoUrl)!} className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen title={activeLesson.title} />
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-black">
                        <video ref={videoRef} src={videoUrl} controls className="w-full h-full"
                          onTimeUpdate={handleVideoTimeUpdate} />
                      </div>
                    )
                  )}

                  {activeLesson.lesson_type === 'image' && (
                    <div className="p-4 lg:p-6">
                      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 flex items-center justify-center min-h-[200px]">
                        <Icon name="image" size={48} className="text-gray-700" />
                      </div>
                    </div>
                  )}

                  {activeLesson.lesson_type === 'text' && activeLesson.content && (
                    <div className="p-4 lg:p-8 max-w-3xl">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                          {activeLesson.content}
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeLesson.lesson_type === 'resource' && (
                    <div className="p-4 lg:p-6">
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                          <Icon name="folder_zip" size={32} className="text-blue-400" />
                        </div>
                        <p className="text-gray-300 text-sm font-medium">Download Resources</p>
                        <p className="text-gray-500 text-xs">Check the resources panel on the right</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson info + actions */}
                <div className="p-4 lg:p-6 border-b border-gray-800 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-display font-bold text-white tracking-tight mb-1">{activeLesson.title}</h2>
                      {activeLesson.description && (
                        <p className="text-sm text-gray-400 leading-relaxed">{activeLesson.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCompleted ? (
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-sm font-medium">
                          <Icon name="check_circle" size={15} fill /> Completed
                        </span>
                      ) : (enrollment || isOwner) ? (
                        <Button onClick={handleMarkComplete} loading={markComplete.isPending}>
                          <Icon name="check_circle" size={15} />
                          Mark Complete
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Sub-navigation: Notes / Resources */}
                  <div className="flex gap-1 mt-4">
                    {([
                      ['notes', 'edit_note', 'Notes'],
                      ['resources', 'attach_file', 'Resources'],
                    ] as const).map(([key, icon, label]) => (
                      <button key={key} onClick={() => setRightPanel(rightPanel === key ? null : key)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                          rightPanel === key
                            ? 'bg-blue-600/15 text-blue-300 border-blue-500/30'
                            : 'text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
                        )}>
                        <Icon name={icon} size={13} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inline notes / resources panel (mobile) */}
                <AnimatePresence>
                  {rightPanel && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden border-b border-gray-800 max-h-80 overflow-y-auto">
                      {rightPanel === 'notes' ? (
                        <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                      ) : (
                        <ResourceList lesson={activeLesson} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Prev / Next navigation */}
                <div className="p-4 flex items-center justify-between gap-3">
                  {(() => {
                    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
                    const prev = idx > 0 ? lessons[idx - 1] : null;
                    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
                    return (
                      <>
                        <button onClick={() => prev && setActiveLessonId(prev.id)} disabled={!prev}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-30 transition-colors text-sm">
                          <Icon name="chevron_left" size={16} />
                          Previous
                        </button>
                        {next ? (
                          <button onClick={() => setActiveLessonId(next.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                            Next
                            <Icon name="chevron_right" size={16} />
                          </button>
                        ) : certificate ? (
                          <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/30 transition-colors">
                            <Icon name="workspace_premium" size={16} fill />
                            View Certificate
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Icon name="flag" size={13} /> End of course
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Right panel: Notes / Resources (desktop) */}
              <AnimatePresence initial={false}>
                {rightPanel && (
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: 300 }} exit={{ width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hidden lg:flex flex-shrink-0 border-l border-gray-800 bg-gray-900 flex-col overflow-hidden"
                  >
                    <div className="w-[300px] h-full flex flex-col">
                      <div className="flex border-b border-gray-800 flex-shrink-0">
                        {([['notes', 'Notes'], ['resources', 'Resources']] as const).map(([key, label]) => (
                          <button key={key} onClick={() => setRightPanel(key)}
                            className={cn('flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
                              rightPanel === key ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'
                            )}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {rightPanel === 'notes' ? (
                          <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                        ) : (
                          <ResourceList lesson={activeLesson} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // No lesson or no access
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="w-16 h-16 bg-gray-800/60 rounded-2xl flex items-center justify-center">
                <Icon name={!enrollment && !isOwner ? 'lock' : 'school'} size={28} className="text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1">
                  {!enrollment && !isOwner ? 'Enroll to start learning' : 'Select a lesson to begin'}
                </h3>
                <p className="text-sm text-gray-500">
                  {!enrollment && !isOwner
                    ? 'This course is free. Enroll to unlock all content.'
                    : 'Choose a lesson from the sidebar.'}
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
