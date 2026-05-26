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
import { VideoPlayer } from '../components/courses/VideoPlayer';
import { LessonComments } from '../components/courses/LessonComments';
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; color: string; size: number; delay: number; duration: number; rotation: number; shape: 'rect' | 'circle' | 'star'; }
const CONFETTI_COLORS = ['#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'];
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8, delay: Math.random() * 1.2, duration: 2.5 + Math.random() * 2,
    rotation: Math.random() * 720 - 360, shape: (['rect','circle','star'] as const)[Math.floor(Math.random() * 3)],
  }));
}
function ConfettiBlast({ active }: { active: boolean }) {
  const particles = useRef(generateParticles(80));
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.current.map((p) => (
        <motion.div key={p.id}
          initial={{ x: `${p.x}vw`, y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: [1,1,0.8,0], rotate: p.rotation }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position:'absolute', top:0, left:0, width:p.size, height:p.shape==='circle'?p.size:p.size*0.6,
            backgroundColor:p.color, borderRadius:p.shape==='circle'?'50%':p.shape==='rect'?'2px':'0',
            clipPath:p.shape==='star'?'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)':undefined }}
        />
      ))}
    </div>
  );
}

// ── Course complete popup ─────────────────────────────────────────────────────

function CourseCompletePopup({ courseName, onViewCertificate, onDismiss }: {
  courseName: string; onViewCertificate: () => void; onDismiss: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div initial={{ scale: 0.7, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260, delay: 0.1 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="relative h-36 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-4 border-white/20 absolute" />
            <div className="w-32 h-32 rounded-full border-4 border-white/20 absolute" />
          </div>
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type:'spring', damping:14, stiffness:200, delay:0.3 }}
            className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/40 shadow-lg"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
            className="relative z-10 mt-2 text-white/90 text-xs font-bold tracking-widest uppercase"
          >Course Complete!</motion.p>
        </div>
        <div className="px-6 pt-5 pb-6">
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
            <h2 className="text-xl font-display font-extrabold text-ink-900 text-center leading-tight mb-1">Congratulations!</h2>
            <p className="text-sm text-ink-500 text-center leading-relaxed mb-1">You've successfully completed</p>
            <p className="text-sm font-bold text-ink-800 text-center leading-snug mb-5 line-clamp-2">{courseName}</p>
            <div className="flex items-center justify-center gap-6 mb-5">
              {[{icon:'🏆',label:'Completed'},{icon:'📜',label:'Certificate'},{icon:'⭐',label:'Achievement'}].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide">{item.label}</span>
                </div>
              ))}
            </div>
            <button onClick={onViewCertificate}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-200 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              View My Certificate
            </button>
            <button onClick={onDismiss} className="w-full mt-2.5 h-10 rounded-2xl text-ink-500 hover:text-ink-800 text-sm font-medium transition-colors">
              Continue Exploring
            </button>
          </motion.div>
        </div>
        <button onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </motion.div>
    </motion.div>
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
      <div className="p-4 border-b border-ink-200 flex-shrink-0">
        <h3 className="text-sm font-display font-bold text-ink-900 mb-3">Lesson Notes</h3>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleCreate(); }}
          rows={3} placeholder="Write a note… (Ctrl+Enter to save)"
          className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-ink-900 text-xs placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
        />
        <button onClick={handleCreate} disabled={!draft.trim() || createNote.isPending}
          className="mt-2 w-full h-9 rounded-xl bg-ink-900 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-colors"
        >Save Note</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {notes.length === 0 ? (
          <div className="text-center py-10">
            <Icon name="edit_note" size={28} className="text-ink-300 mx-auto mb-2" />
            <p className="text-xs text-ink-500 italic">No notes for this lesson yet.</p>
          </div>
        ) : notes.map((note) => (
          <div key={note.id} className="bg-ink-50 border border-ink-200 rounded-xl p-3.5">
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                  className="w-full px-2.5 py-2 rounded-lg bg-white border border-ink-200 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={async () => { await updateNote.mutateAsync({ id: note.id, content: editContent, courseId }); setEditingId(null); }}
                    className="flex-1 h-7 rounded-lg bg-ink-900 text-white text-xs font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 h-7 rounded-lg border border-ink-200 text-ink-500 text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-ink-200">
                  <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                    className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors rounded-md hover:bg-white">
                    <Icon name="edit" size={12} />
                  </button>
                  <button onClick={() => deleteNote.mutate({ id: note.id, courseId })}
                    className="p-1.5 text-ink-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50">
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

// ── Resource list ─────────────────────────────────────────────────────────────

function ResourceList({ lesson }: { lesson: CourseLesson }) {
  const handleDownload = async (res: { name: string; path: string }) => {
    try {
      const { data } = await supabase.storage.from('prompt-media').createSignedUrl(res.path, 60);
      if (!data?.signedUrl) throw new Error();
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = res.name; a.click();
    } catch { toast.error('Download failed'); }
  };

  if (!lesson.resources?.length) return (
    <div className="text-center py-10 px-4 bg-white h-full">
      <Icon name="attach_file" size={28} className="text-ink-300 mx-auto mb-2" />
      <p className="text-xs text-ink-500 italic">No resources for this lesson.</p>
    </div>
  );

  return (
    <div className="p-4 space-y-2 bg-white h-full">
      {lesson.resources.map((res, i) => (
        <button key={i} onClick={() => handleDownload(res)}
          className="w-full flex items-center gap-3 p-3.5 bg-ink-50 hover:bg-ink-100 border border-ink-200 rounded-xl transition-colors text-left group">
          <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="download" size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate group-hover:text-blue-600">{res.name}</p>
            {res.size && <p className="text-xs text-ink-500">{(res.size / 1024 / 1024).toFixed(1)} MB</p>}
          </div>
          <Icon name="download" size={14} className="text-ink-400 group-hover:text-blue-500 flex-shrink-0" />
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
  const [activeTab, setActiveTab] = useState<'discussion' | 'notes' | 'resources'>('discussion');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionBanner, setCompletionBanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCelebration = useCallback(() => {
    setShowConfetti(true);
    setShowCelebration(true);
    setCompletionBanner(true);
    setTimeout(() => setShowConfetti(false), 5000);
  }, []);

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
    if (certificate) setCompletionBanner(true);
  }, [certificate?.id]);

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
    try { await enroll.mutateAsync(courseId); toast.success('Enrolled successfully!'); }
    catch { toast.error('Enrollment failed'); }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !courseId) return;
    const pos = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    await markComplete.mutateAsync({ lessonId: activeLesson.id, courseId, watchPositionSeconds: pos });
    const nowCompleted = new Set([...completedIds, activeLesson.id]);
    const allDone = lessons.length > 0 && nowCompleted.size >= lessons.length;
    if (allDone) {
      triggerCelebration();
      // Issue certificate then send congratulations email (fire-and-forget)
      ;(async () => {
        try {
          const { data: certId } = await supabase.rpc('issue_certificate_if_complete', {
            p_course_id: courseId,
            p_user_id: user!.id,
          });
          if (certId) {
            const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-certificate-email`;
            const { data: session } = await supabase.auth.getSession();
            await fetch(fnUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ cert_id: certId }),
            });
          }
        } catch {
          // best-effort — never surface email errors to the student
        }
      })();
    } else {
      toast.success('Lesson marked complete!');
      const idx = lessons.findIndex((l) => l.id === activeLesson.id);
      const next = lessons.find((l, i) => i > idx && !nowCompleted.has(l.id));
      if (next) setActiveLessonId(next.id);
    }
  };

  const getEmbedUrl = (url: string) => YOUTUBE_EMBED(url) || VIMEO_EMBED(url) || null;
  const toggleSection = (id: string) => setExpandedSections((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectLesson = (id: string) => { setActiveLessonId(id); setMobileSidebarOpen(false); };

  if (!course) return (
    <div className="fixed inset-0 bg-ink-100 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Sidebar lesson list ───────────────────────────────────────────────────

  const SidebarLessons = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Progress header */}
      <div className="px-4 py-4 border-b border-ink-200 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <ProgressRing pct={pct} size={44} stroke={4} />
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-ink-900">{pct}% Complete</p>
            <p className="text-xs text-ink-500">{completedIds.size} of {lessons.length} lessons</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Course label */}
      <div className="px-4 py-2.5 border-b border-ink-200 flex-shrink-0 bg-white">
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-0.5">Course</p>
        <p className="text-xs font-display font-bold text-ink-900 leading-snug line-clamp-2">{course.title}</p>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {sections.map((section, si) => {
          const sLessons = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.position - b.position);
          const isExpanded = expandedSections.has(section.id);
          const sCompleted = sLessons.filter((l) => completedIds.has(l.id)).length;
          return (
            <div key={section.id} className={cn('border-b border-ink-200', si === 0 && 'border-t')}>
              <button onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-ink-50 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink-900 leading-snug line-clamp-1">{section.title}</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">{sCompleted}/{sLessons.length} completed</p>
                </div>
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.18 }} className="inline-flex text-ink-400 flex-shrink-0">
                  <Icon name="expand_more" size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.18 }} className="overflow-hidden bg-ink-50"
                  >
                    {sLessons.map((lesson, li) => {
                      const done = completedIds.has(lesson.id);
                      const active = activeLessonId === lesson.id;
                      const accessible = isOwner || !!enrollment || lesson.is_preview;
                      return (
                        <button key={lesson.id}
                          onClick={() => accessible && selectLesson(lesson.id)}
                          disabled={!accessible}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-ink-200/60',
                            active ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-white',
                            !accessible && 'opacity-40 cursor-not-allowed',
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {done ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                <Icon name="check" size={11} className="text-emerald-600" />
                              </div>
                            ) : (
                              <div className={cn(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold',
                                active ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-ink-300 text-ink-500'
                              )}>
                                {li + 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs font-semibold leading-snug line-clamp-2',
                              active ? 'text-emerald-700' : done ? 'text-ink-400' : 'text-ink-900'
                            )}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', active ? 'text-emerald-600' : 'text-ink-400')}>
                                <Icon name={lessonIcon(lesson.lesson_type)} size={10} />
                                {lesson.lesson_type}
                              </span>
                              {lesson.video_duration_minutes > 0 && (
                                <span className="text-[10px] text-ink-400">{lesson.video_duration_minutes}m</span>
                              )}
                              {lesson.is_preview && !enrollment && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">FREE</span>
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

      {/* Certificate card */}
      {certificate && (
        <div className="px-4 pt-3 pb-1 flex-shrink-0 border-t border-ink-200">
          <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 shadow-md shadow-amber-100 transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0">
              <Icon name="workspace_premium" size={18} className="text-white" fill />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mb-0.5">Your Certificate</p>
              <p className="text-sm font-extrabold text-white leading-tight truncate">View &amp; Download</p>
            </div>
            <Icon name="chevron_right" size={16} className="text-white/70 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Back link */}
      <div className="px-4 py-3 border-t border-ink-200 flex-shrink-0">
        <Link to="/courses" className="flex items-center gap-2 text-xs font-semibold text-ink-400 hover:text-ink-900 transition-colors">
          <Icon name="arrow_back" size={14} />
          Back to all courses
        </Link>
      </div>
    </div>
  );

  // ── Page structure: fixed header + fixed-height body ─────────────────────

  return (
    <div className="flex flex-col bg-white" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* Overlays */}
      <ConfettiBlast active={showConfetti} />
      <AnimatePresence>
        {showCelebration && (
          <CourseCompletePopup courseName={course.title}
            onViewCertificate={() => { setShowCelebration(false); navigate(`/courses/${courseId}/certificate`); }}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Fixed top chrome ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 z-30">

        {/* Completion banner */}
        <AnimatePresence>
          {completionBanner && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg flex-shrink-0">🎉</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-tight">Congratulations! You completed this course!</p>
                    <p className="text-white/80 text-xs hidden sm:block">Your certificate has been generated and is ready to download.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                      <path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Certificate
                  </button>
                  <button onClick={() => setCompletionBanner(false)}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="flex items-center gap-3 px-4 sm:px-5 h-14 bg-white border-b border-ink-200">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith" className="h-7 w-7 object-contain" />
            <span className="hidden sm:block font-display font-black text-ink-900 tracking-tight text-[13px]">aiwithrakshith</span>
          </Link>
          <div className="w-px h-5 bg-ink-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-ink-900 truncate leading-tight">{course.title}</p>
            {enrollment && (
              <div className="hidden sm:flex items-center gap-2 mt-0.5">
                <div className="h-1 w-28 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-ink-400 font-medium">{pct}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {certificate && (
              <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <Icon name="workspace_premium" size={14} fill />
                Certificate
              </button>
            )}
            {isOwner && (
              <button onClick={() => navigate(`/courses/${courseId}/edit`)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors" title="Edit course"
              >
                <Icon name="edit" size={16} />
              </button>
            )}
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
              title={sidebarOpen ? 'Hide lessons' : 'Show lessons'}
            >
              <Icon name={sidebarOpen ? 'menu_open' : 'menu'} size={20} />
            </button>
            <button onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors" title="Show lessons"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </header>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: '1 1 0px', minHeight: 0, overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }} animate={{ width: 296, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
              className="hidden lg:flex flex-shrink-0 border-r border-ink-200 overflow-hidden"
            >
              <div className="w-[296px] h-full flex flex-col overflow-hidden">
                <SidebarLessons />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                transition={{ type:'spring', damping:30, stiffness:280 }}
                className="fixed inset-y-0 left-0 w-[296px] z-50 border-r border-ink-200 shadow-2xl lg:hidden overflow-hidden"
              >
                <div className="h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 flex-shrink-0">
                    <p className="text-sm font-display font-bold text-ink-900">Lessons</p>
                    <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition-colors">
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <SidebarLessons />
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main content ──────────────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 0px', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f8f8' }}>

          {/* Enrollment banner */}
          {!enrollment && !isOwner && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="school" size={16} className="text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 font-medium truncate">Enroll for free to unlock all lessons and track your progress.</p>
              </div>
              <Button size="sm" onClick={handleEnroll} loading={enroll.isPending} className="flex-shrink-0">Enroll Free</Button>
            </div>
          )}

          {activeLesson && canAccess ? (
            <div style={{ display: 'flex', flex: '1 1 0px', minHeight: 0, height: '100%' }}>

              {/* Scrollable lesson column */}
              <div style={{ flex: '1 1 0px', minWidth: 0, overflowY: 'auto', overflowX: 'hidden', height: '100%' }}>

                {/* ── Video / media ── */}
                <div className="flex-shrink-0 bg-gray-950">
                  {activeLesson.lesson_type === 'video' && videoUrl && (
                    getEmbedUrl(videoUrl) ? (
                      <div className="relative aspect-video">
                        <iframe src={getEmbedUrl(videoUrl)!}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen title={activeLesson.title}
                        />
                      </div>
                    ) : (
                      <VideoPlayer src={videoUrl} title={activeLesson.title}
                        markers={activeLesson.timeline_markers ?? []}
                        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                        onTimeUpdate={(s) => {
                          if (saveTimer.current) clearTimeout(saveTimer.current);
                          saveTimer.current = setTimeout(() => {
                            savePosition.mutate({ lessonId: activeLesson.id, courseId: courseId!, seconds: s });
                          }, 5000);
                        }}
                        initialTime={progressList.find((p) => p.lesson_id === activeLesson.id)?.watch_position_seconds}
                      />
                    )
                  )}
                  {activeLesson.lesson_type === 'video' && !videoUrl && (
                    <div className="aspect-video relative overflow-hidden">
                      {mediaLoading ? (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                          <Icon name="play_circle" size={48} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {activeLesson.lesson_type === 'image' && (
                  <div className="p-4 sm:p-6 bg-white">
                    {mediaLoading ? (
                      <div className="rounded-2xl overflow-hidden border border-ink-200 min-h-[200px] bg-ink-100 animate-pulse" />
                    ) : videoUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-ink-200 bg-ink-50 flex items-center justify-center">
                        <img src={videoUrl} alt={activeLesson.title} className="w-full object-contain max-h-[70vh]" />
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden border border-ink-200 bg-ink-50 flex items-center justify-center min-h-[200px]">
                        <Icon name="image" size={48} className="text-ink-300" />
                      </div>
                    )}
                  </div>
                )}

                {activeLesson.lesson_type === 'text' && activeLesson.content && (
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-3xl mx-auto bg-white border border-ink-200 rounded-2xl p-6 sm:p-8">
                      <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{activeLesson.content}</p>
                    </div>
                  </div>
                )}

                {activeLesson.lesson_type === 'resource' && (
                  <div className="p-4 sm:p-6">
                    <div className="max-w-sm mx-auto bg-white border border-ink-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center">
                        <Icon name="folder_zip" size={32} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-ink-900 mb-1">Downloadable Resources</p>
                        <p className="text-sm text-ink-500">Open the Resources tab below to download files for this lesson.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Lesson meta + actions ── */}
                <div className="bg-white border-b border-ink-200 px-4 sm:px-6 py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap max-w-4xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                          activeLesson.lesson_type === 'video' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          activeLesson.lesson_type === 'text' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-ink-100 text-ink-600 border-ink-200'
                        )}>
                          <Icon name={lessonIcon(activeLesson.lesson_type)} size={10} />
                          {activeLesson.lesson_type.charAt(0).toUpperCase() + activeLesson.lesson_type.slice(1)}
                        </span>
                        {activeLesson.video_duration_minutes > 0 && (
                          <span className="text-xs text-ink-400">{activeLesson.video_duration_minutes} min</span>
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
                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
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
                </div>

                {/* ── Prev / Next ── */}
                <div className="px-4 sm:px-6 py-4 bg-white border-b border-ink-200">
                  {(() => {
                    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
                    const prev = idx > 0 ? lessons[idx - 1] : null;
                    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
                    return (
                      <div className="flex items-center justify-between gap-3 max-w-4xl">
                        <button onClick={() => prev && setActiveLessonId(prev.id)} disabled={!prev}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-600 hover:text-ink-900 hover:border-ink-400 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                        >
                          <Icon name="chevron_left" size={16} />
                          Previous
                        </button>
                        <span className="text-xs text-ink-400 hidden sm:block">{idx + 1} / {lessons.length}</span>
                        {next ? (
                          <button onClick={() => setActiveLessonId(next.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
                          >
                            Next <Icon name="chevron_right" size={16} />
                          </button>
                        ) : certificate ? (
                          <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold hover:bg-amber-100 transition-colors"
                          >
                            <Icon name="workspace_premium" size={16} fill />
                            Get Certificate
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold shadow-sm shadow-amber-200 transition-all duration-200"
                          >
                            <Icon name="workspace_premium" size={16} fill />
                            View Certificate
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Tab bar: Discussion / Notes / Resources ── */}
                <div className="bg-white border-b border-ink-200 px-4 sm:px-6">
                  <div className="flex items-center gap-0 max-w-4xl">
                    {([
                      ['discussion', 'chat_bubble_outline', 'Discussion'] as const,
                      ['notes', 'edit_note', 'My Notes'] as const,
                      ['resources', 'attach_file', 'Resources'] as const,
                    ]).map(([key, icon, label]) => (
                      <button key={key}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 transition-all duration-150 mr-1',
                          activeTab === key
                            ? 'text-ink-900 border-ink-900'
                            : 'text-ink-400 border-transparent hover:text-ink-700 hover:border-ink-300'
                        )}
                      >
                        <Icon name={icon} size={13} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab content ── */}
                <div className="max-w-4xl px-4 sm:px-6 py-6">
                  {activeTab === 'discussion' && (
                    <LessonComments
                      lessonId={activeLesson.id}
                      courseId={courseId!}
                      courseOwnerId={course.user_id}
                    />
                  )}
                  {activeTab === 'notes' && (
                    <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
                      <div style={{ minHeight: 300 }}>
                        <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                      </div>
                    </div>
                  )}
                  {activeTab === 'resources' && (
                    <div className="bg-white rounded-2xl border border-ink-200 overflow-hidden">
                      <ResourceList lesson={activeLesson} />
                    </div>
                  )}
                </div>

              </div>

              {/* Desktop right panel (Notes / Resources quick access) */}
              <AnimatePresence initial={false}>
                {rightPanel && (
                  <motion.div initial={{ width: 0 }} animate={{ width: 320 }} exit={{ width: 0 }}
                    transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
                    className="hidden lg:flex flex-shrink-0 border-l border-ink-200 flex-col overflow-hidden"
                  >
                    <div className="w-[320px] h-full flex flex-col">
                      <div className="flex border-b border-ink-200 bg-white flex-shrink-0">
                        {([['notes','Notes'] as const, ['resources','Resources'] as const]).map(([key,label]) => (
                          <button key={key} onClick={() => setRightPanel(key)}
                            className={cn('flex-1 py-3 text-xs font-bold border-b-2 transition-colors',
                              rightPanel === key ? 'text-ink-900 border-ink-900' : 'text-ink-400 border-transparent hover:text-ink-900'
                            )}
                          >{label}</button>
                        ))}
                        <button onClick={() => setRightPanel(null)} className="px-3 text-ink-400 hover:text-ink-900 transition-colors border-b-2 border-transparent">
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
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="w-20 h-20 bg-white border border-ink-200 rounded-2xl flex items-center justify-center shadow-sm">
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
