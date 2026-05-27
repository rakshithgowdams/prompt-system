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
import { CourseQnA } from '../components/courses/CourseQnA';
import { CourseReviews } from '../components/courses/CourseReviews';
import { cn } from '../lib/utils';
import type { CourseLesson } from '../hooks/useCourses';

const SIDEBAR_W = 380;
const HEADER_H = 56;

const YOUTUBE_EMBED = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=1` : null;
};
const VIMEO_EMBED = (url: string) => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
};

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

// ── Course Complete Popup ─────────────────────────────────────────────────────

function CourseCompletePopup({ courseName, onViewCertificate, onDismiss }: {
  courseName: string; onViewCertificate: () => void; onDismiss: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div initial={{ scale: 0.7, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260, delay: 0.1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
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
            <h2 className="text-xl font-bold text-ink-900 text-center leading-tight mb-1">Congratulations!</h2>
            <p className="text-sm text-ink-500 text-center mb-1">You've successfully completed</p>
            <p className="text-sm font-bold text-ink-800 text-center mb-5 line-clamp-2">{courseName}</p>
            <button onClick={onViewCertificate}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Icon name="workspace_premium" size={16} fill />
              View My Certificate
            </button>
            <button onClick={onDismiss} className="w-full mt-2 h-10 rounded-xl text-ink-500 hover:text-ink-800 text-sm font-medium">
              Continue Exploring
            </button>
          </motion.div>
        </div>
        <button onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <Icon name="close" size={14} />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Notes Panel ───────────────────────────────────────────────────────────────

function NotesPanel({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { data: notes = [] } = useLessonNotes(courseId, lessonId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  return (
    <div className="space-y-3">
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey && draft.trim()) { createNote.mutateAsync({ courseId, lessonId, content: draft.trim() }).then(() => setDraft('')); } }}
        rows={3} placeholder="Write a note for this lesson… (Ctrl+Enter to save)"
        className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a435f0] focus:border-transparent resize-none"
      />
      <button onClick={() => { if (!draft.trim() || createNote.isPending) return; createNote.mutateAsync({ courseId, lessonId, content: draft.trim() }).then(() => setDraft('')); }}
        disabled={!draft.trim() || createNote.isPending}
        className="w-full h-9 rounded-lg bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-40 text-white text-xs font-bold transition-colors"
      >Save Note</button>
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="edit_note" size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No notes for this lesson yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                    className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-xs focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={async () => { await updateNote.mutateAsync({ id: note.id, content: editContent, courseId }); setEditingId(null); }}
                      className="flex-1 h-7 rounded-lg bg-[#a435f0] text-white text-xs font-semibold">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 h-7 rounded-lg border border-gray-300 text-gray-600 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-200">
                    <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                      className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded">
                      <Icon name="edit" size={12} />
                    </button>
                    <button onClick={() => deleteNote.mutate({ id: note.id, courseId })}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                      <Icon name="delete" size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resource helpers ──────────────────────────────────────────────────────────

function getResourceType(res: { name: string; mime_type?: string }): 'image' | 'video' | 'pdf' | 'text' | 'other' {
  const mime = res.mime_type ?? '';
  const ext = res.name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4','webm','mov'].includes(ext)) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('text/') || ['txt','md','csv','json'].includes(ext)) return 'text';
  return 'other';
}
function resourceIcon(type: ReturnType<typeof getResourceType>) {
  switch (type) {
    case 'image': return 'image';
    case 'video': return 'play_circle';
    case 'pdf': return 'picture_as_pdf';
    case 'text': return 'article';
    default: return 'attach_file';
  }
}

function ResourcePreviewModal({ name, url, type, onClose, onDownload }: { name: string; url: string; type: ReturnType<typeof getResourceType>; onClose: () => void; onDownload: () => void; }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="relative bg-[#1c1d1f] rounded-xl shadow-2xl overflow-hidden flex flex-col max-w-4xl w-full max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3e4143] flex-shrink-0">
            <Icon name={resourceIcon(type)} size={16} className="text-[#cec0fc]" />
            <p className="flex-1 text-sm font-semibold text-white truncate">{name}</p>
            <button onClick={onDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3e4143] text-[#cec0fc] hover:bg-[#2d2f31] text-xs font-semibold transition-colors">
              <Icon name="download" size={14} />Download
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2d2f31] transition-colors">
              <Icon name="close" size={18} className="text-[#6a6f73]" />
            </button>
          </div>
          <div className="flex-1 overflow-auto min-h-0 bg-[#0f1011] flex items-center justify-center">
            {type === 'image' && <img src={url} alt={name} className="max-w-full max-h-full object-contain p-2" />}
            {type === 'video' && <video src={url} controls autoPlay className="max-w-full w-full" style={{ background: '#000' }} />}
            {type === 'pdf' && <iframe src={url} title={name} className="w-full border-none" style={{ minHeight: '70dvh' }} />}
            {(type === 'text' || type === 'other') && (
              <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
                <Icon name={resourceIcon(type)} size={48} className="text-[#6a6f73]" />
                <p className="font-semibold text-white">{name}</p>
                <p className="text-sm text-[#6a6f73]">Preview not available.</p>
                <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a435f0] text-white text-sm font-bold">
                  <Icon name="download" size={16} />Download to view
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ResourceList({ lesson }: { lesson: CourseLesson }) {
  const [preview, setPreview] = useState<{ name: string; url: string; type: ReturnType<typeof getResourceType> } | null>(null);
  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from('prompt-media').createSignedUrl(path, 300);
    if (!data?.signedUrl) throw new Error('Could not generate URL');
    return data.signedUrl;
  };
  const handlePreview = async (res: { name: string; path: string; mime_type?: string }) => {
    try { const url = await getSignedUrl(res.path); setPreview({ name: res.name, url, type: getResourceType(res) }); }
    catch { toast.error('Could not load preview'); }
  };
  if (!lesson.resources?.length) return (
    <div className="text-center py-10">
      <Icon name="attach_file" size={28} className="text-[#6a6f73] mx-auto mb-2" />
      <p className="text-sm text-[#6a6f73]">No resources for this lesson.</p>
    </div>
  );
  return (
    <>
      <div className="space-y-2">
        {lesson.resources.map((res, i) => {
          const type = getResourceType(res);
          return (
            <button key={i} onClick={() => handlePreview(res)}
              className="w-full flex items-center gap-3 p-3.5 bg-[#2d2f31] hover:bg-[#3e4143] border border-[#3e4143] rounded-lg transition-colors text-left group">
              <div className="w-9 h-9 bg-[#1c1d1f] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name={resourceIcon(type)} size={18} className="text-[#cec0fc]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{res.name}</p>
                {res.size && <p className="text-xs text-[#6a6f73]">{(res.size / 1024 / 1024).toFixed(1)} MB</p>}
              </div>
              <Icon name="open_in_new" size={14} className="text-[#6a6f73] group-hover:text-[#cec0fc] flex-shrink-0" />
            </button>
          );
        })}
      </div>
      {preview && (
        <ResourcePreviewModal name={preview.name} url={preview.url} type={preview.type}
          onClose={() => setPreview(null)}
          onDownload={() => { const a = document.createElement('a'); a.href = preview.url; a.download = preview.name; a.click(); }}
        />
      )}
    </>
  );
}

// ── Lesson icon helper ────────────────────────────────────────────────────────

function lessonIcon(type: string) {
  switch (type) {
    case 'video': return 'play_circle';
    case 'image': return 'image';
    case 'text': return 'article';
    default: return 'folder_zip';
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<'overview' | 'qna' | 'notes' | 'resources' | 'reviews'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  useEffect(() => { if (certificate) setCompletionBanner(true); }, [certificate?.id]);

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
      ;(async () => {
        try {
          const { data: certId } = await supabase.rpc('issue_certificate_if_complete', { p_course_id: courseId, p_user_id: user!.id });
          if (certId) {
            const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-certificate-email`;
            const { data: session } = await supabase.auth.getSession();
            await fetch(fnUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ cert_id: certId }) });
          }
        } catch { /* best-effort */ }
      })();
    } else {
      toast.success('Lesson marked complete!');
      const idx = lessons.findIndex((l) => l.id === activeLesson.id);
      const next = lessons.find((l, i) => i > idx && !nowCompleted.has(l.id));
      if (next) setActiveLessonId(next.id);
    }
  };

  const getEmbedUrl = (url: string) => YOUTUBE_EMBED(url) || VIMEO_EMBED(url) || null;
  const toggleSection = (id: string) => setExpandedSections((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectLesson = (id: string) => { setActiveLessonId(id); setMobileSidebarOpen(false); };

  const lessonIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  if (!course) return (
    <div className="fixed inset-0 bg-[#1c1d1f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Curriculum sidebar content (shared between desktop + mobile drawer) ──
  const CurriculumContent = () => (
    <div className="flex flex-col h-full bg-[#1c1d1f]">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#3e4143] flex-shrink-0">
        <h2 className="text-sm font-bold text-white">Course Content</h2>
        <button onClick={() => { setSidebarOpen(false); setMobileSidebarOpen(false); }}
          className="p-1.5 rounded hover:bg-[#2d2f31] text-[#6a6f73] hover:text-white transition-colors">
          <Icon name="close" size={16} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-[#3e4143] flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#6a6f73]">{completedIds.size}/{lessons.length} completed</span>
          <span className="text-xs font-bold text-white">{pct}%</span>
        </div>
        <div className="h-1 w-full bg-[#3e4143] rounded-full overflow-hidden">
          <div className="h-full bg-[#a435f0] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {/* Section list */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {sections.map((section) => {
          const sLessons = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.position - b.position);
          const isExpanded = expandedSections.has(section.id);
          const sCompleted = sLessons.filter((l) => completedIds.has(l.id)).length;
          const totalMins = sLessons.reduce((sum, l) => sum + (l.video_duration_minutes || 0), 0);
          return (
            <div key={section.id} className="border-b border-[#3e4143]">
              <button onClick={() => toggleSection(section.id)}
                className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-[#2d2f31] transition-colors bg-[#2d2f31]/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug">{section.title}</p>
                  <p className="text-[11px] text-[#6a6f73] mt-1">{sCompleted}/{sLessons.length} · {totalMins > 0 ? `${totalMins} min` : `${sLessons.length} lessons`}</p>
                </div>
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}
                  className="inline-flex text-[#6a6f73] flex-shrink-0 mt-0.5">
                  <Icon name="expand_more" size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.18 }} className="overflow-hidden">
                    {sLessons.map((lesson) => {
                      const done = completedIds.has(lesson.id);
                      const active = activeLessonId === lesson.id;
                      const accessible = isOwner || !!enrollment || lesson.is_preview;
                      return (
                        <button key={lesson.id}
                          onClick={() => accessible && selectLesson(lesson.id)}
                          disabled={!accessible}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-[#3e4143]/60',
                            active ? 'bg-[#3e4143]' : 'hover:bg-[#2d2f31]',
                            !accessible && 'opacity-40 cursor-not-allowed',
                          )}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                              done ? 'bg-[#a435f0] border-[#a435f0]' : 'border-[#6a6f73]'
                            )}>
                              {done && <Icon name="check" size={9} className="text-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs leading-snug line-clamp-2',
                              active ? 'text-white font-semibold' : done ? 'text-[#8d96aa]' : 'text-[#d1d7dc]'
                            )}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#6a6f73]">
                                <Icon name={lessonIcon(lesson.lesson_type)} size={10} />
                                {lesson.lesson_type}
                              </span>
                              {lesson.video_duration_minutes > 0 && (
                                <span className="text-[10px] text-[#6a6f73]">{lesson.video_duration_minutes}m</span>
                              )}
                              {lesson.is_preview && !enrollment && (
                                <span className="text-[9px] font-bold text-[#cec0fc] bg-[#a435f0]/20 px-1.5 py-0.5 rounded">Preview</span>
                              )}
                              {!accessible && <Icon name="lock" size={10} className="text-[#6a6f73]" />}
                            </div>
                          </div>
                          {active && <div className="w-0.5 h-full bg-[#a435f0] absolute left-0 top-0 rounded-r" />}
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
      {/* Certificate */}
      {certificate && (
        <div className="p-3 border-t border-[#3e4143] flex-shrink-0">
          <button onClick={() => { navigate(`/courses/${courseId}/certificate`); setMobileSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all group">
            <Icon name="workspace_premium" size={18} className="text-white" fill />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-white">Your Certificate</p>
              <p className="text-[10px] text-white/70">View &amp; Download</p>
            </div>
            <Icon name="chevron_right" size={14} className="text-white/70" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1c1d1f]" style={{ fontFamily: 'inherit' }}>
      {/* ── Overlays ── */}
      <ConfettiBlast active={showConfetti} />
      <AnimatePresence>
        {showCelebration && (
          <CourseCompletePopup courseName={course.title}
            onViewCertificate={() => { setShowCelebration(false); navigate(`/courses/${courseId}/certificate`); }}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 bg-[#1c1d1f] border-b border-[#3e4143]" style={{ height: HEADER_H }}>
        <Link to="/courses" className="p-1.5 rounded hover:bg-[#2d2f31] text-[#6a6f73] hover:text-white transition-colors flex-shrink-0">
          <Icon name="arrow_back" size={18} />
        </Link>
        <div className="w-px h-5 bg-[#3e4143] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{course.title}</p>
          {enrollment && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1 w-28 bg-[#3e4143] rounded-full overflow-hidden">
                <div className="h-full bg-[#a435f0] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-[#6a6f73] font-medium">{pct}% complete</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {certificate && (
            <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-colors">
              <Icon name="workspace_premium" size={14} fill />
              Certificate
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate(`/courses/${courseId}/edit`)}
              className="p-2 rounded hover:bg-[#2d2f31] text-[#6a6f73] hover:text-white transition-colors" title="Edit course">
              <Icon name="edit" size={16} />
            </button>
          )}
          {/* Toggle sidebar button */}
          <button
            onClick={() => { setSidebarOpen((v) => !v); setMobileSidebarOpen((v) => !v); }}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-all',
              sidebarOpen ? 'bg-[#2d2f31] border-[#3e4143] text-white' : 'border-[#3e4143] text-[#6a6f73] hover:text-white hover:border-[#6a6f73]'
            )}>
            <Icon name="menu_book" size={14} />
            <span className="hidden sm:block">Content</span>
          </button>
        </div>
      </header>

      {/* ── Mobile sidebar drawer ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 shadow-2xl lg:hidden overflow-hidden"
              style={{ width: Math.min(SIDEBAR_W, typeof window !== 'undefined' ? window.innerWidth * 0.9 : SIDEBAR_W), top: HEADER_H }}
            >
              <CurriculumContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="flex" style={{ paddingTop: HEADER_H }}>
        {/* Content area */}
        <div className={cn('flex-1 min-w-0 transition-all duration-300')}
          style={{ marginRight: sidebarOpen ? SIDEBAR_W : 0 }}>

          {/* Completion banner */}
          <AnimatePresence>
            {completionBanner && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="workspace_premium" size={16} className="text-white flex-shrink-0" fill />
                    <p className="text-white font-bold text-sm truncate">Congratulations! You completed this course!</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                      className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 transition-colors">
                      View Certificate
                    </button>
                    <button onClick={() => setCompletionBanner(false)}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enrollment banner */}
          {!enrollment && !isOwner && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#2d2f31] border-b border-[#3e4143]">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="lock" size={15} className="text-[#a435f0] flex-shrink-0" />
                <p className="text-sm text-[#d1d7dc] truncate">Enroll to unlock all lessons and track your progress.</p>
              </div>
              <button onClick={handleEnroll} disabled={enroll.isPending}
                className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {enroll.isPending ? 'Enrolling…' : 'Enroll Free'}
              </button>
            </div>
          )}

          {activeLesson && canAccess ? (
            <>
              {/* ── Video / media area — black bg ── */}
              <div className="bg-black w-full">
                {activeLesson.lesson_type === 'video' && videoUrl && (
                  getEmbedUrl(videoUrl) ? (
                    <div className="relative" style={{ paddingBottom: '56.25%' }}>
                      <iframe src={getEmbedUrl(videoUrl)!} className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title={activeLesson.title} />
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
                  <div className="aspect-video flex items-center justify-center">
                    {mediaLoading
                      ? <div className="w-8 h-8 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin" />
                      : <Icon name="play_circle" size={56} className="text-[#3e4143]" />
                    }
                  </div>
                )}
                {activeLesson.lesson_type === 'image' && (
                  <div className="flex items-center justify-center" style={{ minHeight: 240, background: '#0f1011' }}>
                    {mediaLoading ? (
                      <div className="w-8 h-8 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin" />
                    ) : videoUrl ? (
                      <img src={videoUrl} alt={activeLesson.title} className="max-w-full object-contain" style={{ maxHeight: '70vh' }} />
                    ) : (
                      <Icon name="image" size={56} className="text-[#3e4143]" />
                    )}
                  </div>
                )}
                {(activeLesson.lesson_type === 'text' || activeLesson.lesson_type === 'resource') && (
                  <div className="h-0" />
                )}
              </div>

              {/* ── White content area below video ── */}
              <div className="bg-white">
                {activeLesson.lesson_type === 'text' && activeLesson.content && (
                  <div className="px-6 py-8 border-b border-gray-200">
                    <div className="max-w-3xl">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{activeLesson.content}</p>
                    </div>
                  </div>
                )}
                {activeLesson.lesson_type === 'resource' && (
                  <div className="px-6 py-8 border-b border-gray-200">
                    <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200 max-w-sm">
                      <div className="w-12 h-12 bg-[#a435f0]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon name="folder_zip" size={24} className="text-[#a435f0]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Downloadable Resources</p>
                        <p className="text-xs text-gray-500 mt-0.5">See the Resources tab below to download files.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Lesson title + mark complete ── */}
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
                          activeLesson.lesson_type === 'video' ? 'bg-blue-50 text-blue-700' :
                          activeLesson.lesson_type === 'text' ? 'bg-green-50 text-green-700' :
                          activeLesson.lesson_type === 'image' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          <Icon name={lessonIcon(activeLesson.lesson_type)} size={10} />
                          {activeLesson.lesson_type.charAt(0).toUpperCase() + activeLesson.lesson_type.slice(1)}
                        </span>
                        {activeLesson.video_duration_minutes > 0 && (
                          <span className="text-xs text-gray-400">{activeLesson.video_duration_minutes} min</span>
                        )}
                        {activeLesson.is_preview && (
                          <span className="text-[10px] font-bold text-[#a435f0] bg-[#a435f0]/10 px-2 py-0.5 rounded-full">Free Preview</span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{activeLesson.title}</h2>
                      {activeLesson.description && (
                        <p className="text-sm text-gray-500 leading-relaxed mt-1">{activeLesson.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm font-bold">
                          <Icon name="check_circle" size={16} fill />
                          Completed
                        </div>
                      ) : (enrollment || isOwner) ? (
                        <button onClick={handleMarkComplete} disabled={markComplete.isPending}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-50 text-white text-sm font-bold transition-colors">
                          {markComplete.isPending
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Icon name="check_circle" size={15} />
                          }
                          Mark Complete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* ── Prev / Next ── */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                  <button onClick={() => prevLesson && setActiveLessonId(prevLesson.id)} disabled={!prevLesson}
                    className="flex items-center gap-2 px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                    <Icon name="chevron_left" size={16} />
                    Previous
                  </button>
                  <span className="text-xs text-gray-400 hidden sm:block font-medium">{lessonIndex + 1} / {lessons.length}</span>
                  {nextLesson ? (
                    <button onClick={() => setActiveLessonId(nextLesson.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded bg-[#1c1d1f] hover:bg-black text-white text-sm font-bold transition-colors">
                      Next <Icon name="chevron_right" size={16} />
                    </button>
                  ) : certificate ? (
                    <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                      className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors">
                      <Icon name="workspace_premium" size={15} fill />
                      Get Certificate
                    </button>
                  ) : (
                    <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                      className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold transition-all">
                      <Icon name="workspace_premium" size={15} fill />
                      View Certificate
                    </button>
                  )}
                </div>

                {/* ── Tab bar ── */}
                <div className="border-b border-gray-200 px-6">
                  <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                    {([
                      ['overview',  'menu_book',           'Overview'],
                      ['qna',       'help_outline',        'Q&A'],
                      ['notes',     'edit_note',           'Notes'],
                      ['resources', 'attach_file',         'Resources'],
                      ['reviews',   'star_outline',        'Reviews'],
                    ] as const).map(([key, icon, label]) => (
                      <button key={key} onClick={() => setActiveTab(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap',
                          activeTab === key
                            ? 'text-[#1c1d1f] border-[#1c1d1f]'
                            : 'text-gray-400 border-transparent hover:text-gray-700'
                        )}>
                        <Icon name={icon} size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab content ── */}
                <div className="px-6 py-6">
                  {activeTab === 'overview' && (
                    <div className="max-w-3xl space-y-6">
                      {/* Course description */}
                      {course.description && (
                        <div>
                          <h3 className="text-base font-bold text-gray-900 mb-2">About this course</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
                        </div>
                      )}
                      {/* Lesson details */}
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-3">What you'll learn in this lesson</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: 'play_circle', label: `${lessons.filter(l => l.lesson_type === 'video').length} Video lessons` },
                            { icon: 'article', label: `${lessons.filter(l => l.lesson_type === 'text').length} Text lessons` },
                            { icon: 'image', label: `${lessons.filter(l => l.lesson_type === 'image').length} Image lessons` },
                            { icon: 'attach_file', label: `${lessons.filter(l => l.lesson_type === 'resource').length} Resource files` },
                          ].filter(item => !item.label.startsWith('0')).map((item) => (
                            <div key={item.label} className="flex items-center gap-2.5 text-sm text-gray-700">
                              <Icon name={item.icon} size={16} className="text-[#a435f0] flex-shrink-0" />
                              {item.label}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Course progress summary */}
                      {(enrollment || isOwner) && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-gray-900">Your Progress</h4>
                            <span className="text-sm font-bold text-[#a435f0]">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-[#a435f0] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-500">{completedIds.size} of {lessons.length} lessons completed</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'qna' && (
                    <div className="max-w-3xl">
                      <CourseQnA courseId={courseId!} courseOwnerId={course.user_id} isEnrolled={!!enrollment} activeLessonId={activeLesson.id} />
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="max-w-2xl">
                      <h3 className="text-base font-bold text-gray-900 mb-4">My Notes</h3>
                      <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                    </div>
                  )}

                  {activeTab === 'resources' && (
                    <div className="max-w-2xl">
                      <h3 className="text-base font-bold text-gray-900 mb-4">Lesson Resources</h3>
                      <ResourceList lesson={activeLesson} />
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="max-w-3xl">
                      <CourseReviews courseId={courseId!} courseOwnerId={course.user_id}
                        isEnrolled={!!enrollment} avgRating={course.avg_rating ?? 0} reviewsCount={course.reviews_count ?? 0} />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No lesson selected / no access */
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center" style={{ minHeight: 'calc(100vh - 56px)', background: '#1c1d1f' }}>
              <div className="w-20 h-20 bg-[#2d2f31] border border-[#3e4143] rounded-2xl flex items-center justify-center">
                <Icon name={!enrollment && !isOwner ? 'lock' : 'school'} size={36} className="text-[#6a6f73]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {!enrollment && !isOwner ? 'Enroll to start learning' : 'Select a lesson to begin'}
                </h3>
                <p className="text-sm text-[#6a6f73] max-w-xs mx-auto leading-relaxed">
                  {!enrollment && !isOwner
                    ? 'Enroll for free to unlock all content and track your progress.'
                    : 'Choose a lesson from the course content panel.'}
                </p>
              </div>
              {!enrollment && !isOwner && (
                <button onClick={handleEnroll} disabled={enroll.isPending}
                  className="px-6 py-3 rounded-lg bg-[#a435f0] hover:bg-[#8710d8] disabled:opacity-50 text-white font-bold transition-colors">
                  {enroll.isPending ? 'Enrolling…' : 'Enroll Now — Free'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop right sidebar ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: SIDEBAR_W, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-20 overflow-hidden hidden lg:block"
              style={{ top: HEADER_H }}
            >
              <CurriculumContent />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
