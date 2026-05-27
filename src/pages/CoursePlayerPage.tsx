import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { VideoPlayer } from '../components/courses/VideoPlayer';
import { WatermarkedVideo } from '../components/courses/WatermarkedVideo';
import { CourseQnA } from '../components/courses/CourseQnA';
import { CourseReviews } from '../components/courses/CourseReviews';
import { activateContentProtection, deactivateContentProtection } from '../lib/contentProtection';
import { cn } from '../lib/utils';
import type { CourseLesson } from '../hooks/useCourses';

const SIDEBAR_W = 340;
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
          style={{ position:'absolute', top:0, left:0, width:p.size,
            height: p.shape==='circle' ? p.size : p.size*0.6,
            backgroundColor: p.color,
            borderRadius: p.shape==='circle' ? '50%' : p.shape==='rect' ? '2px' : '0',
            clipPath: p.shape==='star' ? 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' : undefined,
          }}
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
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260, delay: 0.1 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="relative h-40 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-full border-4 border-white/20 absolute" />
            <div className="w-36 h-36 rounded-full border-4 border-white/20 absolute" />
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type:'spring', damping:14, stiffness:200, delay:0.3 }}
            className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/40 shadow-lg"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }}
            className="relative z-10 mt-2 text-white/90 text-xs font-bold tracking-widest uppercase">
            Course Complete!
          </motion.p>
        </div>
        <div className="px-6 pt-5 pb-6">
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Congratulations!</h2>
            <p className="text-sm text-gray-500 text-center mb-1">You've successfully completed</p>
            <p className="text-sm font-bold text-gray-800 text-center mb-5 line-clamp-2">{courseName}</p>
            <button onClick={onViewCertificate}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2">
              <Icon name="workspace_premium" size={16} fill />
              View My Certificate
            </button>
            <button onClick={onDismiss} className="w-full mt-2 h-10 rounded-xl text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
              Continue Exploring
            </button>
          </motion.div>
        </div>
        <button onClick={onDismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
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
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey && draft.trim()) {
            createNote.mutateAsync({ courseId, lessonId, content: draft.trim() }).then(() => setDraft(''));
          }
        }}
        rows={4}
        placeholder="Write a note… (Ctrl+Enter to save)"
        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none transition-all"
      />
      <button
        onClick={() => { if (!draft.trim() || createNote.isPending) return; createNote.mutateAsync({ courseId, lessonId, content: draft.trim() }).then(() => setDraft('')); }}
        disabled={!draft.trim() || createNote.isPending}
        className="w-full h-10 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
      >Save Note</button>
      {notes.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Icon name="edit_note" size={22} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">No notes yet</p>
          <p className="text-xs text-gray-400 mt-1">Your notes for this lesson will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notes.map((note) => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              {editingId === note.id ? (
                <div className="space-y-2.5">
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm focus:outline-none resize-none" />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await updateNote.mutateAsync({ id: note.id, content: editContent, courseId }); setEditingId(null); }}
                      className="flex-1 h-8 rounded-lg bg-gray-900 text-white text-xs font-semibold">Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 h-8 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-3 pt-2.5 border-t border-gray-100">
                    <button onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100">
                      <Icon name="edit" size={13} />
                    </button>
                    <button onClick={() => deleteNote.mutate({ id: note.id, courseId })}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                      <Icon name="delete" size={13} />
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

function ResourcePreviewModal({ name, url, type, onClose, onDownload }: {
  name: string; url: string; type: ReturnType<typeof getResourceType>; onClose: () => void; onDownload: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="relative bg-gray-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-4xl w-full max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <Icon name={resourceIcon(type)} size={16} className="text-amber-400" />
            <p className="flex-1 text-sm font-semibold text-white truncate">{name}</p>
            <button onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/10 text-xs font-semibold transition-colors">
              <Icon name="download" size={14} />Download
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <Icon name="close" size={18} className="text-white/50" />
            </button>
          </div>
          <div className="flex-1 overflow-auto min-h-0 bg-black flex items-center justify-center">
            {type === 'image' && <img src={url} alt={name} className="max-w-full max-h-full object-contain p-2" />}
            {type === 'video' && <video src={url} controls autoPlay className="max-w-full w-full" style={{ background: '#000' }} />}
            {type === 'pdf' && <iframe src={url} title={name} className="w-full border-none" style={{ minHeight: '70dvh' }} />}
            {(type === 'text' || type === 'other') && (
              <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
                <Icon name={resourceIcon(type)} size={48} className="text-white/20" />
                <p className="font-semibold text-white">{name}</p>
                <p className="text-sm text-white/40">Preview not available.</p>
                <button onClick={onDownload}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold">
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

  const handlePreview = async (res: { name: string; path: string; mime_type?: string }) => {
    try {
      const { data } = await supabase.storage.from('prompt-media').createSignedUrl(res.path, 300);
      if (!data?.signedUrl) throw new Error('No URL');
      setPreview({ name: res.name, url: data.signedUrl, type: getResourceType(res) });
    } catch { toast.error('Could not load preview'); }
  };

  if (!lesson.resources?.length) return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
        <Icon name="attach_file" size={24} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600">No resources</p>
      <p className="text-xs text-gray-400 mt-1">This lesson has no downloadable files.</p>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {lesson.resources.map((res, i) => {
          const type = getResourceType(res);
          return (
            <button key={i} onClick={() => handlePreview(res)}
              className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors text-left group shadow-sm">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                <Icon name={resourceIcon(type)} size={18} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{res.name}</p>
                {res.size && <p className="text-xs text-gray-400 mt-0.5">{(res.size / 1024 / 1024).toFixed(1)} MB</p>}
              </div>
              <Icon name="open_in_new" size={15} className="text-gray-300 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
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

// ── Lesson icon ───────────────────────────────────────────────────────────────

function lessonIcon(type: string) {
  switch (type) {
    case 'video': return 'play_circle';
    case 'image': return 'image';
    case 'text': return 'article';
    default: return 'folder_zip';
  }
}

// ── Curriculum Sidebar ────────────────────────────────────────────────────────

interface SidebarProps {
  sections: ReturnType<typeof useCourseSections>['data'];
  lessons: CourseLesson[];
  completedIds: Set<string>;
  pct: number;
  activeLessonId: string | null;
  expandedSections: Set<string>;
  isOwner: boolean;
  enrollment: unknown;
  certificate: unknown;
  onToggleSection: (id: string) => void;
  onSelectLesson: (id: string) => void;
  onNavigateCertificate: () => void;
}

function Sidebar({
  sections = [], lessons, completedIds, pct, activeLessonId, expandedSections,
  isOwner, enrollment, certificate,
  onToggleSection, onSelectLesson, onNavigateCertificate,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">Course Content</h2>
          <p className="text-[11px] text-white/40 mt-0.5">{lessons.length} lessons</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-white/40">{completedIds.size} of {lessons.length} completed</span>
          <span className="text-[11px] font-bold text-white">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400 rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {(sections ?? []).map((section) => {
          const sLessons = lessons
            .filter((l) => l.section_id === section.id)
            .sort((a, b) => a.position - b.position);
          const isExpanded = expandedSections.has(section.id);
          const sCompleted = sLessons.filter((l) => completedIds.has(l.id)).length;
          const totalMins = sLessons.reduce((sum, l) => sum + (l.video_duration_minutes || 0), 0);

          return (
            <div key={section.id} className="border-b border-white/6">
              {/* Section header */}
              <button
                onClick={() => onToggleSection(section.id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug">{section.title}</p>
                  <p className="text-[10px] text-white/35 mt-1">
                    {sCompleted}/{sLessons.length} lessons{totalMins > 0 && ` · ${totalMins}m`}
                  </p>
                </div>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-white/30 flex-shrink-0 mt-0.5 inline-flex"
                >
                  <Icon name="expand_more" size={16} />
                </motion.span>
              </button>

              {/* Lessons */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {sLessons.map((lesson) => {
                      const done = completedIds.has(lesson.id);
                      const active = activeLessonId === lesson.id;
                      const accessible = isOwner || !!enrollment || lesson.is_preview;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => accessible && onSelectLesson(lesson.id)}
                          disabled={!accessible}
                          className={cn(
                            'relative w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-white/4',
                            active ? 'bg-white/10' : 'hover:bg-white/5',
                            !accessible && 'opacity-40 cursor-not-allowed',
                          )}
                        >
                          {active && <div className="absolute left-0 inset-y-0 w-0.5 bg-emerald-400 rounded-r" />}

                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={cn(
                                'rounded-full border-2 flex items-center justify-center transition-all',
                                done ? 'bg-emerald-500 border-emerald-500' : active ? 'border-white/50' : 'border-white/20'
                              )}
                              style={{ width: 18, height: 18 }}
                            >
                              {done && <Icon name="check" size={10} className="text-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs leading-snug line-clamp-2',
                              active ? 'text-white font-semibold' : done ? 'text-white/40' : 'text-white/70'
                            )}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] text-white/30">
                                <Icon name={lessonIcon(lesson.lesson_type)} size={10} />
                                {lesson.lesson_type}
                              </span>
                              {lesson.video_duration_minutes > 0 && (
                                <span className="text-[10px] text-white/30">{lesson.video_duration_minutes}m</span>
                              )}
                              {lesson.is_preview && !enrollment && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">
                                  Preview
                                </span>
                              )}
                              {!accessible && <Icon name="lock" size={10} className="text-white/25" />}
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

      {/* Certificate footer */}
      {certificate && (
        <div className="p-3 border-t border-white/8 flex-shrink-0">
          <button
            onClick={onNavigateCertificate}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all group"
          >
            <Icon name="workspace_premium" size={18} className="text-white" fill />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-white leading-tight">Your Certificate</p>
              <p className="text-[10px] text-white/70 mt-0.5">View &amp; Download</p>
            </div>
            <Icon name="chevron_right" size={14} className="text-white/60" />
          </button>
        </div>
      )}
    </div>
  );
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

  // Desktop sidebar — default CLOSED so mobile/tablet won't see it at all
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  // Mobile/tablet drawer — always closed by default
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) ?? null,
    [lessons, activeLessonId],
  );
  const completedIds = useMemo(
    () => new Set(progressList.filter((p) => p.completed).map((p) => p.lesson_id)),
    [progressList],
  );
  const pct = useMemo(
    () => lessons.length > 0 ? Math.round((completedIds.size / lessons.length) * 100) : 0,
    [completedIds.size, lessons.length],
  );
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

  // Content protection — active only on course player pages
  useEffect(() => {
    if (!courseId || !activeLessonId) return;
    activateContentProtection({
      courseId,
      lessonId: activeLessonId,
      onDevToolsDetected: () => {
        toast.error('Developer tools detected. Please close them to continue watching.', {
          duration: 6000,
          id: 'devtools-warning',
        });
      },
    });
    return () => deactivateContentProtection();
  }, [courseId, activeLessonId]);

  const videoUrlCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setVideoUrl(null);
    if (!activeLesson) return;
    if (activeLesson.video_path) {
      const cached = videoUrlCache.current.get(activeLesson.video_path);
      if (cached) { setVideoUrl(cached); return; }
      setMediaLoading(true);
      supabase.storage.from('prompt-media').createSignedUrl(activeLesson.video_path, 86400)
        .then(({ data }) => {
          const url = data?.signedUrl ?? null;
          if (url) videoUrlCache.current.set(activeLesson.video_path!, url);
          setVideoUrl(url);
        })
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
            await fetch(fnUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ cert_id: certId }),
            });
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
  const selectLesson = (id: string) => { setActiveLessonId(id); setDrawerOpen(false); };

  const lessonIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const handleNavigateCertificate = () => { navigate(`/courses/${courseId}/certificate`); setDrawerOpen(false); };

  const sidebarProps: SidebarProps = {
    sections, lessons, completedIds, pct, activeLessonId, expandedSections,
    isOwner, enrollment, certificate,
    onToggleSection: toggleSection,
    onSelectLesson: selectLesson,
    onNavigateCertificate: handleNavigateCertificate,
  };

  if (!course) return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading course…</p>
      </div>
    </div>
  );

  const TABS = [
    { key: 'overview',  icon: 'menu_book',    label: 'Overview' },
    { key: 'qna',       icon: 'help_outline', label: 'Q&A' },
    { key: 'notes',     icon: 'edit_note',    label: 'Notes' },
    { key: 'resources', icon: 'attach_file',  label: 'Resources' },
    { key: 'reviews',   icon: 'star_outline', label: 'Reviews' },
  ] as const;

  // The desktop sidebar shifts content via marginRight only on lg+
  // On mobile/tablet the marginRight must be 0
  const desktopMargin = desktopSidebarOpen ? SIDEBAR_W : 0;

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Overlays */}
      <ConfettiBlast active={showConfetti} />
      <AnimatePresence>
        {showCelebration && (
          <CourseCompletePopup
            courseName={course.title}
            onViewCertificate={() => { setShowCelebration(false); navigate(`/courses/${courseId}/certificate`); }}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Fixed header ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 sm:px-4 bg-gray-950/95 backdrop-blur-xl border-b border-white/8"
        style={{ height: HEADER_H }}
      >
        <Link to="/courses"
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all">
          <Icon name="arrow_back" size={18} />
        </Link>

        <div className="w-px h-4 bg-white/10 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate leading-tight">{course.title}</p>
          {enrollment && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative h-1 w-20 sm:w-28 bg-white/10 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-white/40 hidden sm:block">{pct}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {certificate && (
            <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/25 transition-all">
              <Icon name="workspace_premium" size={14} fill />
              <span className="hidden md:inline">Certificate</span>
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate(`/courses/${courseId}/edit`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <Icon name="edit" size={16} />
            </button>
          )}

          {/* Desktop toggle — only visible lg+ */}
          <button
            onClick={() => setDesktopSidebarOpen((v) => !v)}
            className={cn(
              'hidden lg:flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition-all',
              desktopSidebarOpen
                ? 'bg-white/10 border-white/15 text-white'
                : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
            )}
          >
            <Icon name="menu_book" size={15} />
            <span>Content</span>
          </button>

          {/* Mobile/tablet hamburger — only visible below lg */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all relative"
            aria-label="Open course content"
          >
            <Icon name="menu_book" size={18} />
            {/* Dot indicator when lessons exist */}
            {lessons.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-gray-950" />
            )}
          </button>
        </div>
      </header>

      {/* ── Mobile / Tablet Drawer (slides from LEFT) — only below lg ──────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 z-50 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-[320px] shadow-2xl lg:hidden"
              style={{ paddingTop: HEADER_H }}
            >
              <Sidebar {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Page body ────────────────────────────────────────────────────────── */}
      <div className="flex" style={{ paddingTop: HEADER_H }}>

        {/* Main content */}
        <div
          className="flex-1 min-w-0 w-full transition-all duration-300"
          style={{ marginRight: desktopSidebarOpen ? desktopMargin : 0 }}
        >
          {/* Completion banner */}
          <AnimatePresence>
            {completionBanner && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="workspace_premium" size={16} className="text-white flex-shrink-0" fill />
                    <p className="text-white font-bold text-sm truncate">You completed this course!</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                      className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/25 transition-colors whitespace-nowrap">
                      View Certificate
                    </button>
                    <button onClick={() => setCompletionBanner(false)}
                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enrollment banner */}
          {!enrollment && !isOwner && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 border-b border-white/8">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="lock" size={15} className="text-white/40 flex-shrink-0" />
                <p className="text-sm text-white/50 truncate">Enroll to unlock all lessons and track progress.</p>
              </div>
              <button onClick={handleEnroll} disabled={enroll.isPending}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-all">
                {enroll.isPending ? 'Enrolling…' : 'Enroll Free'}
              </button>
            </div>
          )}

          {activeLesson && canAccess ? (
            <>
              {/* ── Video / media — always 100% width ── */}
              <div className="w-full bg-black">
                {activeLesson.lesson_type === 'video' && activeLesson.video_path && (
                  <WatermarkedVideo
                    lessonId={activeLesson.id}
                    title={activeLesson.title}
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
                )}
                {activeLesson.lesson_type === 'video' && !activeLesson.video_path && videoUrl && (
                  getEmbedUrl(videoUrl) ? (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={getEmbedUrl(videoUrl)!}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    </div>
                  ) : (
                    <VideoPlayer
                      src={videoUrl}
                      title={activeLesson.title}
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
                {activeLesson.lesson_type === 'video' && !activeLesson.video_path && !videoUrl && (
                  <div className="aspect-video w-full flex items-center justify-center bg-gray-950">
                    {mediaLoading
                      ? <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <Icon name="play_circle" size={64} className="text-white/10" />
                    }
                  </div>
                )}
                {activeLesson.lesson_type === 'image' && (
                  <div className="w-full flex items-center justify-center bg-gray-950" style={{ minHeight: 240 }}>
                    {mediaLoading
                      ? <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : videoUrl
                        ? <img src={videoUrl} alt={activeLesson.title} className="w-full object-contain" style={{ maxHeight: '70vh' }} />
                        : <Icon name="image" size={64} className="text-white/10" />
                    }
                  </div>
                )}
              </div>

              {/* ── White content area ── */}
              <div className="bg-white w-full">

                {/* Text lesson content */}
                {activeLesson.lesson_type === 'text' && activeLesson.content && (
                  <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-100">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-w-3xl">
                      {activeLesson.content}
                    </p>
                  </div>
                )}

                {/* Resource hint */}
                {activeLesson.lesson_type === 'resource' && (
                  <div className="px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-100">
                    <div className="inline-flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <div className="w-10 h-10 bg-gray-900/8 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon name="folder_zip" size={20} className="text-gray-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Downloadable Resources</p>
                        <p className="text-xs text-gray-500 mt-0.5">Check the Resources tab below.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lesson header */}
                <div className="px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full',
                          activeLesson.lesson_type === 'video' ? 'bg-blue-50 text-blue-600' :
                          activeLesson.lesson_type === 'text'  ? 'bg-emerald-50 text-emerald-700' :
                          activeLesson.lesson_type === 'image' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          <Icon name={lessonIcon(activeLesson.lesson_type)} size={11} />
                          {activeLesson.lesson_type.charAt(0).toUpperCase() + activeLesson.lesson_type.slice(1)}
                        </span>
                        {activeLesson.video_duration_minutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Icon name="schedule" size={12} />
                            {activeLesson.video_duration_minutes} min
                          </span>
                        )}
                        {activeLesson.is_preview && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            Free Preview
                          </span>
                        )}
                        <span className="text-xs text-gray-300">Lesson {lessonIndex + 1} / {lessons.length}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{activeLesson.title}</h2>
                      {activeLesson.description && (
                        <p className="text-sm text-gray-500 leading-relaxed mt-1.5">{activeLesson.description}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-bold">
                          <Icon name="check_circle" size={16} fill />
                          Completed
                        </div>
                      ) : (enrollment || isOwner) ? (
                        <button onClick={handleMarkComplete} disabled={markComplete.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-bold transition-all">
                          {markComplete.isPending
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Icon name="check_circle" size={15} />
                          }
                          <span className="hidden sm:inline">Mark Complete</span>
                          <span className="sm:hidden">Complete</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Prev / Next navigation */}
                <div className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
                    disabled={!prevLesson}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                  >
                    <Icon name="chevron_left" size={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <span className="text-xs text-gray-400 font-medium">{lessonIndex + 1} / {lessons.length}</span>

                  {nextLesson ? (
                    <button onClick={() => setActiveLessonId(nextLesson.id)}
                      className="flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-all">
                      <span className="hidden sm:inline">Next Lesson</span>
                      <span className="sm:hidden">Next</span>
                      <Icon name="chevron_right" size={16} />
                    </button>
                  ) : (
                    <button onClick={() => navigate(`/courses/${courseId}/certificate`)}
                      className="flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold transition-all">
                      <Icon name="workspace_premium" size={15} fill />
                      <span className="hidden sm:inline">Certificate</span>
                    </button>
                  )}
                </div>

                {/* Tab bar */}
                <div className="border-b border-gray-100 px-2 sm:px-4">
                  <div className="flex items-center overflow-x-auto hide-scrollbar">
                    {TABS.map(({ key, icon, label }) => (
                      <button key={key} onClick={() => setActiveTab(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                          activeTab === key
                            ? 'text-gray-900 border-gray-900'
                            : 'text-gray-400 border-transparent hover:text-gray-600'
                        )}>
                        <Icon name={icon} size={13} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div className="px-4 sm:px-6 lg:px-8 py-6">
                  {activeTab === 'overview' && (
                    <div className="max-w-3xl space-y-7">
                      {course.description && (
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-2">About this course</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Course contents</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { icon: 'play_circle', count: lessons.filter(l => l.lesson_type === 'video').length, label: 'Video lessons', color: 'text-blue-500' },
                            { icon: 'article', count: lessons.filter(l => l.lesson_type === 'text').length, label: 'Text lessons', color: 'text-emerald-500' },
                            { icon: 'image', count: lessons.filter(l => l.lesson_type === 'image').length, label: 'Image lessons', color: 'text-amber-500' },
                            { icon: 'attach_file', count: lessons.filter(l => l.lesson_type === 'resource').length, label: 'Resources', color: 'text-rose-500' },
                          ].filter(item => item.count > 0).map((item) => (
                            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Icon name={item.icon} size={15} className={item.color} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900">{item.count}</p>
                                <p className="text-xs text-gray-500 truncate">{item.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {(enrollment || isOwner) && (
                        <div className="p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-gray-900">Your Progress</h4>
                            <span className="text-sm font-bold text-gray-900">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
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
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-900">My Notes</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Personal notes for this lesson</p>
                      </div>
                      <NotesPanel courseId={courseId!} lessonId={activeLesson.id} />
                    </div>
                  )}

                  {activeTab === 'resources' && (
                    <div className="max-w-2xl">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Lesson Resources</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Downloadable files for this lesson</p>
                      </div>
                      <ResourceList lesson={activeLesson} />
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="max-w-3xl">
                      <CourseReviews
                        courseId={courseId!}
                        courseOwnerId={course.user_id}
                        isEnrolled={!!enrollment}
                        avgRating={course.avg_rating ?? 0}
                        reviewsCount={course.reviews_count ?? 0}
                      />
                    </div>
                  )}
                </div>

                {/* ── Mobile quick-access bottom bar ───────────────────────── */}
                <div className="lg:hidden sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm z-20">
                  <div className="flex items-center justify-between px-4 py-2.5 gap-2">
                    {/* Curriculum button */}
                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all flex-1"
                    >
                      <Icon name="menu_book" size={18} />
                      <span className="text-[10px] font-semibold">Lessons</span>
                    </button>

                    {/* Progress pill */}
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">{pct}%</span>
                      </div>
                      <span className="text-[9px] text-gray-400">{completedIds.size}/{lessons.length} done</span>
                    </div>

                    {/* Mark complete / next */}
                    {isCompleted ? (
                      nextLesson ? (
                        <button
                          onClick={() => setActiveLessonId(nextLesson.id)}
                          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all flex-1"
                        >
                          <Icon name="skip_next" size={18} />
                          <span className="text-[10px] font-semibold">Next</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/courses/${courseId}/certificate`)}
                          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all flex-1"
                        >
                          <Icon name="workspace_premium" size={18} fill />
                          <span className="text-[10px] font-semibold">Certificate</span>
                        </button>
                      )
                    ) : (enrollment || isOwner) ? (
                      <button
                        onClick={handleMarkComplete}
                        disabled={markComplete.isPending}
                        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 transition-all flex-1"
                      >
                        {markComplete.isPending
                          ? <div className="w-4.5 h-4.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" style={{ width: 18, height: 18 }} />
                          : <Icon name="check_circle" size={18} />
                        }
                        <span className="text-[10px] font-semibold">Complete</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleEnroll}
                        disabled={enroll.isPending}
                        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all flex-1"
                      >
                        <Icon name="school" size={18} />
                        <span className="text-[10px] font-semibold">Enroll</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Empty / locked state */
            <div
              className="flex flex-col items-center justify-center gap-6 px-6 py-16 text-center"
              style={{ minHeight: `calc(100vh - ${HEADER_H}px)` }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 220 }}
                className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center"
              >
                <Icon name={!enrollment && !isOwner ? 'lock' : 'school'} size={36} className="text-white/25" />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {!enrollment && !isOwner ? 'Enroll to start learning' : 'Select a lesson to begin'}
                </h3>
                <p className="text-sm text-white/40 max-w-xs mx-auto leading-relaxed">
                  {!enrollment && !isOwner
                    ? 'Enroll for free to unlock all content and track your progress.'
                    : 'Tap the book icon in the header to pick a lesson.'}
                </p>
              </div>
              {!enrollment && !isOwner && (
                <button onClick={handleEnroll} disabled={enroll.isPending}
                  className="px-8 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-white/90 disabled:opacity-50 transition-all">
                  {enroll.isPending ? 'Enrolling…' : 'Enroll Now — Free'}
                </button>
              )}
              {/* Mobile: open lessons from empty state */}
              {(enrollment || isOwner) && (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-all text-sm font-semibold"
                >
                  <Icon name="menu_book" size={16} />
                  Browse Lessons
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop right sidebar — only renders and shows on lg+ ─────────── */}
        <AnimatePresence>
          {desktopSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: SIDEBAR_W, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-20 overflow-hidden border-l border-white/8 hidden lg:block"
              style={{ top: HEADER_H }}
            >
              <Sidebar {...sidebarProps} />
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
