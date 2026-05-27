import { useState, useRef, useEffect, useCallback, useMemo, type RefObject } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCourse, useUpdateCourse, useDeleteCourse, useCourseSections, useCourseLessons,
  useCreateSection, useUpdateSection, useDeleteSection,
  useCreateLesson, useUpdateLesson, useDeleteLesson,
  useCourseGallery, useAddGalleryItem, useDeleteGalleryItem, useUpdateGalleryItem,
} from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { CourseShareModal } from '../components/courses/CourseShareModal';
import type { CourseSection, CourseLesson, TimelineMarker, CourseGalleryItem } from '../hooks/useCourses';


// ── Smooth-scroll hook ────────────────────────────────────────────────────────
// Intercepts wheel events on a container and applies eased momentum scrolling
// so trackpad two-finger scroll feels fluid rather than choppy.

function useSmoothScroll(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let targetY = el.scrollTop;
    let currentY = el.scrollTop;
    let rafId: number | null = null;
    const EASE = 0.12; // lower = more inertia / smoother

    const animate = () => {
      const diff = targetY - currentY;
      if (Math.abs(diff) < 0.5) {
        currentY = targetY;
        el.scrollTop = targetY;
        rafId = null;
        return;
      }
      currentY += diff * EASE;
      el.scrollTop = currentY;
      rafId = requestAnimationFrame(animate);
    };

    const onWheel = (e: WheelEvent) => {
      // Only handle vertical wheel; let horizontal pass through
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();

      const delta = e.deltaMode === 1 ? e.deltaY * 20   // line mode (Firefox)
                  : e.deltaMode === 2 ? e.deltaY * 300  // page mode
                  : e.deltaY;                            // pixel mode (trackpad)

      const maxScroll = el.scrollHeight - el.clientHeight;
      targetY = Math.max(0, Math.min(maxScroll, targetY + delta));

      if (!rafId) {
        currentY = el.scrollTop;
        rafId = requestAnimationFrame(animate);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef]);
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useMemo(() => ((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delay);
  }) as T, [delay]);
}

// ── Section title input with local state + debounced save ─────────────────────

function SectionTitleInput({ section, courseId, onUpdate }: {
  section: { id: string; title: string };
  courseId: string;
  onUpdate: (id: string, courseId: string, title: string) => void;
}) {
  const [value, setValue] = useState(section.title);
  const debouncedSave = useDebounce((title: string) => {
    onUpdate(section.id, courseId, title);
  }, 600);

  // Sync if the section prop changes from outside (e.g. initial load)
  const prevId = useRef(section.id);
  useEffect(() => {
    if (prevId.current !== section.id) {
      setValue(section.title);
      prevId.current = section.id;
    }
  }, [section.id, section.title]);

  return (
    <input
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        debouncedSave(e.target.value);
      }}
      className="flex-1 bg-transparent text-sm font-semibold text-ink-900 focus:outline-none placeholder-ink-300 min-w-0"
      placeholder="Section title"
    />
  );
}

// ── Safe filename helper ──────────────────────────────────────────────────────

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} className="animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Cover upload ──────────────────────────────────────────────────────────────

function CourseCoverUpload({ courseId, currentPath, onUploaded }: {
  courseId: string;
  currentPath: string | null;
  onUploaded: (path: string) => void;
}) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentPath) return;
    supabase.storage.from('prompt-media').createSignedUrl(currentPath, 3600)
      .then(({ data }) => data?.signedUrl && setUrl(data.signedUrl))
      .catch(() => {});
  }, [currentPath]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      // uid is first segment so storage policy matches
      const path = `${user!.id}/course-covers/${courseId}.${ext}`;
      setProgress(30);
      const { error } = await supabase.storage.from('prompt-media').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw new Error(error.message);
      setProgress(80);
      const { data: signed, error: signErr } = await supabase.storage
        .from('prompt-media').createSignedUrl(path, 3600);
      if (signErr) throw new Error(signErr.message);
      setProgress(100);
      if (signed?.signedUrl) setUrl(signed.signedUrl);
      onUploaded(path);
      toast.success('Cover image uploaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div
      className="relative aspect-video w-full rounded-lg overflow-hidden bg-ink-100 border-2 border-dashed border-ink-300 hover:border-brand-400/50 transition-colors cursor-pointer group"
      onClick={() => !uploading && inputRef.current?.click()}
    >
      {url ? (
        <img src={url} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-500">
          <Icon name="add_photo_alternate" size={32} />
          <span className="text-sm font-medium">Click to upload cover image</span>
          <span className="text-xs text-ink-300">JPG, PNG, WEBP · Max 10 MB</span>
        </div>
      )}
      {/* Hover / uploading overlay */}
      <div className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-2 text-white ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {uploading ? (
          <>
            <Spinner size={24} />
            <span className="text-sm font-medium">Uploading… {progress}%</span>
            <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <><Icon name="upload" size={18} /><span className="text-sm font-medium">Change Cover</span></>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ── Lesson editor ─────────────────────────────────────────────────────────────

type LessonTab = 'content' | 'resources' | 'timeline';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LessonEditor({
  lesson,
  onSave,
  onDelete,
  onClose,
}: {
  lesson: CourseLesson;
  onSave: (patch: Partial<CourseLesson>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  useSmoothScroll(scrollRef);
  const [tab, setTab] = useState<LessonTab>('content');
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [content, setContent] = useState(lesson.content);
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [durationMin, setDurationMin] = useState(String(lesson.video_duration_minutes || ''));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [resources, setResources] = useState(lesson.resources ?? []);
  const [markers, setMarkers] = useState<TimelineMarker[]>(lesson.timeline_markers ?? []);
  const [newMarkerTime, setNewMarkerTime] = useState('');
  const [newMarkerLabel, setNewMarkerLabel] = useState('');

  // Local path state — tracks uploaded paths so delete/replace reflects immediately
  const [videoPath, setVideoPath] = useState(lessonType === 'video' ? (lesson.video_path ?? null) : null);
  const [imagePath, setImagePath] = useState(lessonType === 'image' ? (lesson.video_path ?? null) : null);
  const [mainFilePath, setMainFilePath] = useState(lessonType === 'resource' ? (lesson.video_path ?? null) : null);

  // Signed URLs for already-uploaded content
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const resInputRef = useRef<HTMLInputElement>(null);

  // Load signed URLs for existing uploaded content
  useEffect(() => {
    if (videoPath && lessonType === 'video') {
      supabase.storage.from('prompt-media').createSignedUrl(videoPath, 3600)
        .then(({ data }) => data?.signedUrl && setVideoPreviewUrl(data.signedUrl))
        .catch(() => {});
    } else if (!videoPath) {
      setVideoPreviewUrl(null);
    }
  }, [videoPath, lessonType]);

  // For image lessons: video_path stores the image path
  useEffect(() => {
    if (imagePath && lessonType === 'image') {
      supabase.storage.from('prompt-media').createSignedUrl(imagePath, 3600)
        .then(({ data }) => data?.signedUrl && setImagePreviewUrl(data.signedUrl))
        .catch(() => {});
    } else if (!imagePath) {
      setImagePreviewUrl(null);
    }
  }, [imagePath, lessonType]);

  const doUpload = async (file: File, path: string, label: string): Promise<string> => {
    setUploading(true);
    setUploadProgress(10);
    setUploadLabel(label);
    try {
      const { error } = await supabase.storage.from('prompt-media').upload(path, file, {
        upsert: true, contentType: file.type,
      });
      if (error) throw new Error(error.message);
      setUploadProgress(90);
      return path;
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadLabel('');
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error('Video must be under 500 MB'); return; }
    try {
      const path = `${user!.id}/courses/${lesson.course_id}/lessons/${lesson.id}/${safeName(file.name)}`;
      await doUpload(file, path, 'Uploading video');
      setVideoPath(path);
      const { data: signed } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
      if (signed?.signedUrl) setVideoPreviewUrl(signed.signedUrl);
      onSave({ video_path: path, title, description, lesson_type: lessonType, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0, resources });
      toast.success('Video uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
  };

  const handleDeleteVideo = () => {
    setVideoPath(null);
    setVideoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onSave({ video_path: null, title, description, lesson_type: lessonType, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0, resources });
    toast.success('Video removed');
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 100 * 1024 * 1024) { toast.error('Image must be under 100 MB'); return; }
    try {
      const path = `${user!.id}/courses/${lesson.course_id}/images/${lesson.id}/${safeName(file.name)}`;
      await doUpload(file, path, 'Uploading image');
      setImagePath(path);
      const { data: signed } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
      if (signed?.signedUrl) setImagePreviewUrl(signed.signedUrl);
      onSave({ video_path: path, title, description, lesson_type: 'image', content, is_preview: isPreview, resources });
      toast.success('Image uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
  };

  const handleDeleteImage = () => {
    setImagePath(null);
    setImagePreviewUrl(null);
    if (imgInputRef.current) imgInputRef.current.value = '';
    onSave({ video_path: null, title, description, lesson_type: 'image', content, is_preview: isPreview, resources });
    toast.success('Image removed');
  };

  const handleMainFileUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { toast.error('File must be under 100 MB'); return; }
    try {
      const path = `${user!.id}/courses/${lesson.course_id}/files/${lesson.id}/${safeName(file.name)}`;
      await doUpload(file, path, 'Uploading file');
      setMainFilePath(path);
      const newRes = [{ name: file.name, path, size: file.size, mime_type: file.type }, ...resources.filter((r) => r.path !== path)];
      setResources(newRes);
      onSave({ video_path: path, title, description, lesson_type: 'resource', content, is_preview: isPreview, resources: newRes });
      toast.success('File uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
  };

  const handleDeleteMainFile = () => {
    setMainFilePath(null);
    if (mainFileInputRef.current) mainFileInputRef.current.value = '';
    onSave({ video_path: null, title, description, lesson_type: 'resource', content, is_preview: isPreview, resources });
    toast.success('File removed');
  };

  const handleResourceUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) { toast.error('Resource file must be under 100 MB'); return; }
    try {
      const path = `${user!.id}/courses/${lesson.course_id}/resources/${lesson.id}/${safeName(file.name)}`;
      await doUpload(file, path, 'Uploading resource');
      const newRes = [...resources, { name: file.name, path, size: file.size, mime_type: file.type }];
      setResources(newRes);
      onSave({ title, description, lesson_type: lessonType, video_url: videoUrl || null, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0, resources: newRes });
      toast.success('Resource uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
  };

  const replaceResource = (idx: number, file: File) => {
    const old = resources[idx];
    const newPath = `${user!.id}/courses/${lesson.course_id}/resources/${lesson.id}/${safeName(file.name)}`;
    doUpload(file, newPath, `Replacing ${old.name}`).then(() => {
      const newRes = resources.map((r, i) => i === idx ? { name: file.name, path: newPath, size: file.size, mime_type: file.type } : r);
      setResources(newRes);
      onSave({ title, description, lesson_type: lessonType, video_url: videoUrl || null, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0, resources: newRes });
      toast.success('Resource replaced');
    }).catch((err) => toast.error(err instanceof Error ? err.message : 'Replace failed'));
  };

  const removeResource = (idx: number) => {
    const newRes = resources.filter((_, i) => i !== idx);
    setResources(newRes);
    onSave({ title, description, lesson_type: lessonType, video_url: videoUrl || null, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0, resources: newRes });
    toast.success('Attachment removed');
  };

  // Store mutable refs so the debounced flush always uses the latest values
  const titleRef = useRef(title);
  const descRef = useRef(description);
  const contentRef = useRef(content);
  const videoUrlRef = useRef(videoUrl);
  const durationRef = useRef(durationMin);
  const isPreviewRef = useRef(isPreview);
  const lessonTypeRef = useRef(lessonType);
  titleRef.current = title;
  descRef.current = description;
  contentRef.current = content;
  videoUrlRef.current = videoUrl;
  durationRef.current = durationMin;
  isPreviewRef.current = isPreview;
  lessonTypeRef.current = lessonType;

  const save = useCallback(() => onSave({
    title: titleRef.current,
    description: descRef.current,
    lesson_type: lessonTypeRef.current,
    video_url: videoUrlRef.current || null,
    content: contentRef.current,
    is_preview: isPreviewRef.current,
    video_duration_minutes: parseFloat(durationRef.current) || 0,
    resources, timeline_markers: markers,
  } as Partial<CourseLesson>), [onSave, resources, markers]);

  const debouncedSave = useDebounce(save, 600);

  const UploadZone = ({ onClick, accept, icon, label, sublabel, color = 'blue' }: {
    onClick: () => void; accept: string; icon: string; label: string; sublabel: string; color?: string;
  }) => (
    <button
      type="button"
      onClick={() => !uploading && onClick()}
      disabled={uploading}
      className={cn(
        'w-full border-2 border-dashed rounded-lg transition-all flex flex-col items-center justify-center gap-2 py-6 px-4 disabled:opacity-50 disabled:cursor-not-allowed',
        color === 'blue' ? 'border-ink-300 hover:border-brand-400/60 hover:bg-brand-50' :
        color === 'emerald' ? 'border-ink-300 hover:border-emerald-500/60 hover:bg-green-50' :
        'border-ink-300 hover:border-amber-500/60 hover:bg-amber-600/5',
      )}
    >
      {uploading ? (
        <>
          <Spinner size={20} />
          <span className="text-sm font-medium text-ink-700">{uploadLabel}…</span>
          <div className="w-36 h-1.5 bg-ink-300 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-400 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            'w-11 h-11 rounded-lg flex items-center justify-center',
            color === 'blue' ? 'bg-brand-50 text-brand-400' :
            color === 'emerald' ? 'bg-green-50 text-success' :
            'bg-amber-500/15 text-amber-400',
          )}>
            <Icon name={icon} size={22} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-900">{label}</p>
            <p className="text-xs text-ink-500 mt-0.5">{sublabel}</p>
          </div>
        </>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-ink-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-300 flex-shrink-0">
        <h3 className="font-semibold text-ink-900 text-sm truncate flex-1 mr-3">{title || 'Untitled Lesson'}</h3>
        <div className="flex items-center gap-1.5">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-ink-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Icon name="delete" size={15} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors">
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-300 flex-shrink-0">
        {([['content', 'Content'], ['resources', 'Resources'], ...(lessonType === 'video' ? [['timeline', 'Timeline'] as const] : [])] as [LessonTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === key ? 'text-brand-400 border-brand-400' : 'text-ink-500 border-transparent hover:text-ink-700'
            )}>
            {label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {tab === 'content' && (
          <>
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-ink-500 mb-1 block">Title</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); debouncedSave(); }}
                className="w-full h-9 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Lesson title" />
            </div>

            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-ink-500 mb-1.5 block">Lesson Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  ['video', 'smart_display', 'Video'],
                  ['image', 'image', 'Image'],
                  ['text', 'article', 'Text'],
                  ['resource', 'attach_file', 'File'],
                ] as const).map(([type, icon, label]) => (
                  <button key={type} onClick={() => setLessonType(type)}
                    className={cn('flex flex-col items-center gap-1 py-2.5 rounded-md border text-xs font-medium transition-all',
                      lessonType === type
                        ? 'bg-brand-50 border-brand-400 text-brand-400'
                        : 'bg-ink-100 border-ink-300 text-ink-500 hover:border-ink-300 hover:text-ink-900'
                    )}>
                    <Icon name={icon} size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── VIDEO type ── */}
            {lessonType === 'video' && (
              <div className="space-y-3">
                {/* Existing uploaded video preview */}
                {videoPreviewUrl && !uploading && (
                  <div className="space-y-2">
                    <div className="rounded-md overflow-hidden bg-black aspect-video">
                      <video src={videoPreviewUrl} controls className="w-full h-full" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md bg-ink-100 border border-ink-300 text-xs font-medium text-ink-700 hover:bg-brand-50 hover:border-brand-400 hover:text-brand-500 transition-all"
                      >
                        <Icon name="upload" size={13} />
                        Replace Video
                      </button>
                      <button
                        onClick={handleDeleteVideo}
                        className="flex items-center justify-center gap-1.5 px-3 h-8 rounded-md bg-ink-100 border border-ink-300 text-xs font-medium text-ink-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
                      >
                        <Icon name="delete" size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {!videoPreviewUrl && !uploading && (
                  <UploadZone
                    onClick={() => fileInputRef.current?.click()}
                    accept="video/*"
                    icon="smart_display"
                    label="Upload Video"
                    sublabel="MP4, MOV, WEBM · Max 500 MB"
                    color="blue"
                  />
                )}

                {uploading && (
                  <UploadZone
                    onClick={() => {}}
                    accept="video/*"
                    icon="smart_display"
                    label="Uploading…"
                    sublabel=""
                    color="blue"
                  />
                )}

                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) { handleVideoUpload(e.target.files[0]); e.target.value = ''; } }} />

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-ink-300" />
                  <span className="text-xs text-ink-300 font-medium">or paste a link</span>
                  <div className="flex-1 h-px bg-ink-300" />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1 block">YouTube / Vimeo URL</label>
                  <input value={videoUrl} onChange={(e) => { setVideoUrl(e.target.value); debouncedSave(); }}
                    className="w-full h-9 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="https://youtube.com/watch?v=..." />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1 block">Duration (minutes)</label>
                  <input value={durationMin} onChange={(e) => { setDurationMin(e.target.value); debouncedSave(); }} type="number" min="0"
                    className="w-full h-9 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="e.g. 12.5" />
                </div>
              </div>
            )}

            {/* ── IMAGE type ── */}
            {lessonType === 'image' && (
              <div className="space-y-3">
                {/* Current image preview */}
                {imagePreviewUrl && !uploading ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-ink-100">
                      <img src={imagePreviewUrl} alt="Lesson" className="w-full object-contain max-h-64" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => imgInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md bg-ink-100 border border-ink-300 text-xs font-medium text-ink-700 hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition-all"
                      >
                        <Icon name="upload" size={13} />
                        Replace Image
                      </button>
                      <button
                        onClick={handleDeleteImage}
                        className="flex items-center justify-center gap-1.5 px-3 h-8 rounded-md bg-ink-100 border border-ink-300 text-xs font-medium text-ink-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
                      >
                        <Icon name="delete" size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                ) : !uploading ? (
                  <UploadZone
                    onClick={() => imgInputRef.current?.click()}
                    accept="image/*"
                    icon="add_photo_alternate"
                    label="Upload Image"
                    sublabel="JPG, PNG, GIF, WEBP · Max 100 MB"
                    color="emerald"
                  />
                ) : (
                  <UploadZone
                    onClick={() => {}}
                    accept="image/*"
                    icon="add_photo_alternate"
                    label="Uploading…"
                    sublabel=""
                    color="emerald"
                  />
                )}
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0]); e.target.value = ''; } }} />

                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1 block">Caption / Notes</label>
                  <textarea value={content} onChange={(e) => { setContent(e.target.value); debouncedSave(); }} rows={3}
                    className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                    placeholder="Add a caption or context for this image..." />
                </div>
              </div>
            )}

            {/* ── TEXT type ── */}
            {lessonType === 'text' && (
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1 block">Lesson Content</label>
                <textarea value={content} onChange={(e) => { setContent(e.target.value); debouncedSave(); }} rows={12}
                  className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none font-mono leading-relaxed"
                  placeholder={'# Lesson Title\n\nWrite your lesson content here...\n\n## Section\n\nSupports markdown formatting.'} />
              </div>
            )}

            {/* ── FILE / RESOURCE type ── */}
            {lessonType === 'resource' && (
              <div className="space-y-3">
                {/* Show current main file if any */}
                {mainFilePath && !uploading && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 bg-amber-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="description" size={20} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">
                          {mainFilePath.split('/').pop()}
                        </p>
                        <p className="text-xs text-amber-600/70 mt-0.5">Main lesson file</p>
                      </div>
                    </div>
                    <div className="flex border-t border-amber-500/20">
                      <button
                        onClick={() => mainFileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-700 hover:bg-amber-500/10 transition-colors border-r border-amber-500/20"
                      >
                        <Icon name="upload" size={12} />
                        Replace File
                      </button>
                      <button
                        onClick={handleDeleteMainFile}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Icon name="delete" size={12} />
                        Delete File
                      </button>
                    </div>
                  </div>
                )}

                {!mainFilePath && !uploading && (
                  <UploadZone
                    onClick={() => mainFileInputRef.current?.click()}
                    accept="*/*"
                    icon="upload_file"
                    label="Upload Main File"
                    sublabel="PDF, ZIP, DOCX, PPTX, or any file · Max 100 MB"
                    color="amber"
                  />
                )}

                {uploading && (
                  <UploadZone
                    onClick={() => {}}
                    accept="*/*"
                    icon="upload_file"
                    label="Uploading…"
                    sublabel=""
                    color="amber"
                  />
                )}

                <input ref={mainFileInputRef} type="file" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) { handleMainFileUpload(e.target.files[0]); e.target.value = ''; } }} />

                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1 block">Description / Instructions</label>
                  <textarea value={content} onChange={(e) => { setContent(e.target.value); debouncedSave(); }} rows={4}
                    className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                    placeholder="Describe what this file is and how students should use it..." />
                </div>
              </div>
            )}

            {/* Description (all types) */}
            <div>
              <label className="text-xs font-medium text-ink-500 mb-1 block">Lesson Summary</label>
              <textarea value={description} onChange={(e) => { setDescription(e.target.value); debouncedSave(); }} rows={2}
                className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                placeholder="Brief one-line description of this lesson" />
            </div>

            {/* Free preview toggle */}
            <button
              onClick={() => setIsPreview((v) => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-md border transition-all text-left',
                isPreview
                  ? 'bg-teal-500/10 border-teal-500/30'
                  : 'bg-ink-100 border-ink-300 hover:border-ink-300',
              )}
            >
              <div className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', isPreview ? 'bg-teal-500' : 'bg-ink-300')}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', isPreview ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
              <div>
                <span className="text-sm font-medium text-ink-900">Free Preview</span>
                <p className="text-xs text-ink-500">Non-enrolled students can view this lesson</p>
              </div>
            </button>
          </>
        )}

        {/* ── Resources tab ── */}
        {tab === 'resources' && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink-900 mb-0.5">Attachments</p>
              <p className="text-xs text-ink-500">Downloadable files for students (PDFs, ZIPs, code, etc.)</p>
            </div>

            <button onClick={() => !uploading && resInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-ink-300 hover:border-brand-400/60 hover:bg-brand-50 rounded-lg text-xs transition-all flex flex-col items-center justify-center gap-2 py-5 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? (
                <>
                  <Spinner size={18} />
                  <span className="text-sm text-ink-700">{uploadLabel}…</span>
                  <div className="w-32 h-1.5 bg-ink-300 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-brand-400 rounded-full" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 bg-brand-50 text-brand-400 rounded-md flex items-center justify-center">
                    <Icon name="attach_file" size={18} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-ink-900">Add Attachment</p>
                    <p className="text-ink-500 text-xs mt-0.5">Any file type · Max 100 MB</p>
                  </div>
                </>
              )}
            </button>
            <input ref={resInputRef} type="file" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleResourceUpload(e.target.files[0])} />

            {resources.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="folder_open" size={28} className="text-ink-300 mx-auto mb-2" />
                <p className="text-xs text-ink-300">No attachments yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map((res, i) => {
                  const replaceInputId = `replace-res-${i}`;
                  const fileIcon =
                    res.mime_type?.startsWith('image/') ? 'image' :
                    res.mime_type?.startsWith('video/') ? 'smart_display' :
                    res.mime_type === 'application/pdf' ? 'picture_as_pdf' :
                    res.mime_type?.includes('zip') ? 'folder_zip' : 'description';
                  const iconColor =
                    res.mime_type?.startsWith('image/') ? 'bg-green-50 text-green-500' :
                    res.mime_type?.startsWith('video/') ? 'bg-brand-50 text-brand-400' :
                    res.mime_type === 'application/pdf' ? 'bg-red-50 text-red-400' :
                    res.mime_type?.includes('zip') ? 'bg-amber-50 text-amber-500' : 'bg-ink-100 text-ink-500';
                  return (
                    <div key={i} className="rounded-lg border border-ink-200 bg-white overflow-hidden">
                      <div className="flex items-center gap-2.5 p-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconColor)}>
                          <Icon name={fileIcon} size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-ink-900 truncate">{res.name}</p>
                          <p className="text-[10px] text-ink-400 mt-0.5">{formatBytes(res.size)}</p>
                        </div>
                      </div>
                      <div className="flex border-t border-ink-200">
                        <label
                          htmlFor={replaceInputId}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-500 transition-colors cursor-pointer border-r border-ink-200"
                        >
                          <Icon name="upload" size={12} />
                          Replace
                        </label>
                        <input
                          id={replaceInputId}
                          type="file"
                          className="hidden"
                          onChange={(e) => { if (e.target.files?.[0]) { replaceResource(i, e.target.files[0]); e.target.value = ''; } }}
                        />
                        <button
                          onClick={() => removeResource(i)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Icon name="delete" size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Timeline tab ── */}
        {tab === 'timeline' && lessonType === 'video' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink-900 mb-0.5">Timeline Markers</p>
              <p className="text-xs text-ink-500">Add chapter markers that appear on the video progress bar for students to jump to key sections.</p>
            </div>

            {/* Add marker form */}
            <div className="p-3 bg-ink-50 rounded-lg border border-ink-200 space-y-2.5">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <div>
                  <label className="text-[10px] font-medium text-ink-500 mb-0.5 block">Time</label>
                  <input
                    value={newMarkerTime}
                    onChange={(e) => setNewMarkerTime(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-ink-300 text-ink-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="0:30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-ink-500 mb-0.5 block">Label</label>
                  <input
                    value={newMarkerLabel}
                    onChange={(e) => setNewMarkerLabel(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-ink-300 text-ink-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="e.g. Introduction"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newMarkerLabel.trim() || !newMarkerTime.trim()) return;
                  const parts = newMarkerTime.split(':').map(Number);
                  let seconds = 0;
                  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                  else seconds = parts[0] || 0;
                  if (isNaN(seconds) || seconds < 0) { toast.error('Invalid time format. Use m:ss or h:mm:ss'); return; }
                  setMarkers((prev) => [...prev, { time_seconds: seconds, label: newMarkerLabel.trim() }].sort((a, b) => a.time_seconds - b.time_seconds));
                  setNewMarkerTime('');
                  setNewMarkerLabel('');
                }}
                disabled={!newMarkerLabel.trim() || !newMarkerTime.trim()}
                className="w-full h-8 rounded-md bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
              >
                Add Marker
              </button>
            </div>

            {/* Markers list */}
            {markers.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="flag" size={28} className="text-ink-200 mx-auto mb-2" />
                <p className="text-xs text-ink-400">No markers yet. Add timestamps so students can navigate easily.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {markers.map((m, i) => {
                  const h = Math.floor(m.time_seconds / 3600);
                  const min = Math.floor((m.time_seconds % 3600) / 60);
                  const sec = m.time_seconds % 60;
                  const timeStr = h > 0
                    ? `${h}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
                    : `${min}:${sec.toString().padStart(2, '0')}`;
                  return (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-amber-50 border border-amber-200/60 rounded-lg group">
                      <div className="w-7 h-7 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <Icon name="flag" size={12} className="text-amber-600" />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-700 flex-shrink-0 w-12">{timeStr}</span>
                      <p className="flex-1 text-xs font-medium text-ink-800 truncate">{m.label}</p>
                      <button
                        onClick={() => setMarkers((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-ink-300 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-ink-300 flex-shrink-0">
        <Button className="w-full" onClick={save}>
          <Icon name="save" size={14} />
          Save Lesson
        </Button>
      </div>
    </div>
  );
}

// ── Gallery Editor ────────────────────────────────────────────────────────────

function CourseGalleryEditor({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { data: items = [] } = useCourseGallery(courseId);
  const addItem = useAddGalleryItem();
  const deleteItem = useDeleteGalleryItem();
  const updateItem = useUpdateGalleryItem();

  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [editingCaption, setEditingCaption] = useState<{ id: string; value: string } | null>(null);
  const [lightbox, setLightbox] = useState<CourseGalleryItem | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!items.length) return;
    const paths = items.map(i => i.storage_path).filter(p => !signedUrls[p]);
    if (!paths.length) return;
    Promise.all(paths.map(p =>
      supabase.storage.from('prompt-media').createSignedUrl(p, 3600)
        .then(({ data }) => ({ path: p, url: data?.signedUrl ?? '' }))
    )).then(results => {
      setSignedUrls(prev => {
        const next = { ...prev };
        results.forEach(({ path, url }) => { if (url) next[path] = url; });
        return next;
      });
    });
  }, [items]);

  const upload = async (file: File, type: 'image' | 'video') => {
    if (!user) return;
    const maxMb = type === 'video' ? 500 : 100;
    if (file.size > maxMb * 1024 * 1024) { toast.error(`Max ${maxMb} MB`); return; }
    setUploading(true); setUploadPct(0);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `course-gallery/${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('prompt-media').upload(path, file, {
        cacheControl: '3600', upsert: false,
      });
      if (upErr) throw upErr;
      setUploadPct(100);
      await addItem.mutateAsync({ course_id: courseId, media_type: type, storage_path: path, caption: '', position: items.length });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} added to gallery`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally { setUploading(false); setUploadPct(0); }
  };

  const saveCaption = async () => {
    if (!editingCaption) return;
    await updateItem.mutateAsync({ id: editingCaption.id, course_id: courseId, caption: editingCaption.value });
    setEditingCaption(null);
  };

  const handleDelete = async (item: CourseGalleryItem) => {
    if (!confirm('Remove this item from the gallery?')) return;
    await supabase.storage.from('prompt-media').remove([item.storage_path]).catch(() => {});
    await deleteItem.mutateAsync({ id: item.id, course_id: courseId });
    toast.success('Removed');
  };

  const images = items.filter(i => i.media_type === 'image');
  const videos = items.filter(i => i.media_type === 'video');

  return (
    <div className="space-y-6">
      {/* Upload buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => !uploading && imgInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink-100 hover:bg-ink-200 border border-ink-300 text-ink-700 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Icon name="add_photo_alternate" size={16} className="text-green-500" />
          Add Image
        </button>
        <button
          onClick={() => !uploading && vidInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink-100 hover:bg-ink-200 border border-ink-300 text-ink-700 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Icon name="video_call" size={16} className="text-brand-400" />
          Add Video
        </button>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner size={14} />
            <span>Uploading… {uploadPct}%</span>
          </div>
        )}
      </div>
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) { upload(e.target.files[0], 'image'); e.target.value = ''; } }} />
      <input ref={vidInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) { upload(e.target.files[0], 'video'); e.target.value = ''; } }} />

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-ink-200 rounded-xl">
          <Icon name="collections" size={36} className="text-ink-200 mx-auto mb-2" />
          <p className="text-sm text-ink-400 font-medium">No gallery items yet</p>
          <p className="text-xs text-ink-300 mt-1">Add images or short videos to showcase your course</p>
        </div>
      ) : (
        <>
          {/* Images section */}
          {images.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="image" size={13} className="text-green-500" />
                Images ({images.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map(item => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-ink-200 bg-ink-50">
                    <div className="aspect-video bg-ink-100 cursor-pointer" onClick={() => setLightbox(item)}>
                      {signedUrls[item.storage_path] ? (
                        <img src={signedUrls[item.storage_path]} alt={item.caption || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Spinner size={18} />
                        </div>
                      )}
                    </div>
                    {/* Caption + actions */}
                    <div className="p-2">
                      {editingCaption?.id === item.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={editingCaption.value}
                            onChange={e => setEditingCaption({ ...editingCaption, value: e.target.value })}
                            onBlur={saveCaption}
                            onKeyDown={e => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(null); }}
                            className="flex-1 text-xs px-2 py-1 rounded bg-ink-100 border border-ink-300 text-ink-900 focus:outline-none"
                            placeholder="Add caption…"
                          />
                        </div>
                      ) : (
                        <p
                          className="text-[11px] text-ink-500 truncate cursor-pointer hover:text-ink-700"
                          onClick={() => setEditingCaption({ id: item.id, value: item.caption })}
                        >
                          {item.caption || <span className="italic text-ink-300">Add caption…</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos section */}
          {videos.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="smart_display" size={13} className="text-brand-400" />
                Videos ({videos.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map(item => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-ink-200 bg-black">
                    {signedUrls[item.storage_path] ? (
                      <video
                        src={signedUrls[item.storage_path]}
                        controls
                        className="w-full aspect-video object-contain bg-black"
                        controlsList="nodownload"
                        disablePictureInPicture
                      />
                    ) : (
                      <div className="aspect-video flex items-center justify-center">
                        <Spinner size={20} />
                      </div>
                    )}
                    <div className="p-2 bg-white">
                      {editingCaption?.id === item.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={editingCaption.value}
                            onChange={e => setEditingCaption({ ...editingCaption, value: e.target.value })}
                            onBlur={saveCaption}
                            onKeyDown={e => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(null); }}
                            className="flex-1 text-xs px-2 py-1 rounded bg-ink-100 border border-ink-300 text-ink-900 focus:outline-none"
                            placeholder="Add caption…"
                          />
                        </div>
                      ) : (
                        <p
                          className="text-[11px] text-ink-500 truncate cursor-pointer hover:text-ink-700"
                          onClick={() => setEditingCaption({ id: item.id, value: item.caption })}
                        >
                          {item.caption || <span className="italic text-ink-300">Add caption…</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox for images */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="relative max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              {signedUrls[lightbox.storage_path] && (
                <img src={signedUrls[lightbox.storage_path]} alt={lightbox.caption} className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
              )}
              {lightbox.caption && (
                <p className="text-white/70 text-sm text-center mt-3">{lightbox.caption}</p>
              )}
              <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <Icon name="close" size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: course, isLoading } = useCourse(courseId ?? '');
  const { data: sections = [] } = useCourseSections(courseId ?? '');
  const { data: lessons = [] } = useCourseLessons(courseId ?? '');

  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const [activeTab, setActiveTab] = useState<'structure' | 'details' | 'settings'>('structure');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Smooth-scroll refs for each scrollable panel
  const curriculumScrollRef = useRef<HTMLDivElement>(null);
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  useSmoothScroll(curriculumScrollRef);
  useSmoothScroll(detailsScrollRef);
  useSmoothScroll(settingsScrollRef);

  // Course fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [language, setLanguage] = useState('English');
  const [tags, setTags] = useState('');
  const [requirements, setRequirements] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState('');

  useEffect(() => {
    if (!course) return;
    setTitle(course.title);
    setDescription(course.description);
    setShortDesc(course.short_description);
    setCategory(course.category);
    setLevel(course.level);
    setLanguage(course.language);
    setTags(course.tags.join(', '));
    setRequirements(course.requirements.join('\n'));
    setWhatYouLearn(course.what_you_learn.join('\n'));
    setExpandedSections(new Set(sections.map((s) => s.id)));
  }, [course?.id, sections.length]);

  const saveCourseDetails = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await updateCourse.mutateAsync({
        id: course.id,
        title, description, short_description: shortDesc,
        category, level, language,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        requirements: requirements.split('\n').map((t) => t.trim()).filter(Boolean),
        what_you_learn: whatYouLearn.split('\n').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Details saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!course) return;
    const newState = !course.is_published;
    try {
      await updateCourse.mutateAsync({ id: course.id, is_published: newState });
      toast.success(newState ? 'Course published!' : 'Course unpublished');
    } catch { toast.error('Failed'); }
  };

  const handleAddSection = async () => {
    if (!course) return;
    const pos = sections.length;
    try {
      const s = await createSection.mutateAsync({ courseId: course.id, title: 'New Section', position: pos });
      setExpandedSections((prev) => new Set([...prev, s.id]));
    } catch { toast.error('Failed to create section'); }
  };

  const handleAddLesson = async (section: CourseSection) => {
    if (!course) return;
    const sectionLessons = lessons.filter((l) => l.section_id === section.id);
    try {
      const l = await createLesson.mutateAsync({
        course_id: course.id, section_id: section.id,
        title: 'New Lesson', position: sectionLessons.length,
      });
      setEditingLesson(l);
    } catch { toast.error('Failed to create lesson'); }
  };

  const handleSaveLesson = useCallback(async (patch: Partial<CourseLesson>) => {
    if (!editingLesson) return;
    try {
      // Merge patch on top of current saved state so partial saves never wipe existing fields
      const merged = { ...editingLesson, ...patch };
      const updated = await updateLesson.mutateAsync({ id: editingLesson.id, ...merged });
      setEditingLesson(updated);
    } catch { toast.error('Failed to save lesson'); }
  }, [editingLesson, updateLesson]);

  const handleDeleteLesson = async () => {
    if (!editingLesson || !course) return;
    if (!confirm(`Delete "${editingLesson.title}"?`)) return;
    try {
      await deleteLesson.mutateAsync({ id: editingLesson.id, courseId: course.id });
      setEditingLesson(null);
      toast.success('Lesson deleted');
    } catch { toast.error('Failed'); }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Total duration
  const totalMin = lessons.reduce((sum, l) => sum + Number(l.video_duration_minutes || 0), 0);

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <svg className="h-8 w-8 animate-spin text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-ink-500 text-sm">Loading editor...</p>
      </div>
    </div>
  );

  if (!course) return <div className="p-8 text-center text-ink-500">Course not found.</div>;
  if (course.user_id !== user?.id) return <div className="p-8 text-center text-ink-500">Access denied.</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 py-3 bg-white/95 backdrop-blur-md border-b border-ink-300 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/courses')} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0">
            <Icon name="arrow_back" size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-ink-900 truncate">{course.title || 'Untitled Course'}</h1>
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', course.is_published ? 'text-success bg-green-50' : 'text-ink-500 bg-ink-100')}>
                {course.is_published ? 'PUBLISHED' : 'DRAFT'}
              </span>
              {totalMin > 0 && <span className="text-[11px] text-ink-500">{Math.round(totalMin)}m total</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={handlePublish}
            className={cn('flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold border transition-colors',
              course.is_published
                ? 'border-ink-300 text-ink-500 hover:border-ink-400 hover:text-ink-900'
                : 'border-emerald-500/50 text-success hover:bg-green-50'
            )}>
            <Icon name={course.is_published ? 'unpublished' : 'publish'} size={15} className="flex-shrink-0" />
            <span className="hidden sm:inline">{course.is_published ? 'Unpublish' : 'Publish'}</span>
          </button>
          <button onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 transition-colors">
            <Icon name="share" size={15} className="flex-shrink-0" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button onClick={() => navigate(`/courses/${course.id}/learn`)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-400 border border-brand-100 hover:bg-brand-100 transition-colors">
            <Icon name="play_circle" size={15} className="flex-shrink-0" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Editor tabs */}
      <div className="flex border-b border-ink-300 bg-white flex-shrink-0">
        {([
          ['structure', 'auto_awesome_mosaic', 'Curriculum'],
          ['details', 'info', 'Details'],
          ['settings', 'tune', 'Settings'],
        ] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === key ? 'text-brand-400 border-brand-400 bg-brand-50' : 'text-ink-500 border-transparent hover:text-ink-700 hover:bg-ink-100'
            )}>
            <Icon name={icon} size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 lg:overflow-hidden">

        {/* ── Curriculum tab ── */}
        {activeTab === 'structure' && (
          <div className="flex flex-1 min-w-0 lg:overflow-hidden">
            {/* Section/lesson tree */}
            <div className={cn('flex flex-col bg-white border-r border-ink-300 lg:overflow-y-auto', editingLesson ? 'w-80 flex-shrink-0 hidden lg:flex' : 'flex-1')}>
              <div className="p-4 border-b border-ink-300 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">Curriculum</h2>
                  <p className="text-xs text-ink-500">{sections.length} sections · {lessons.length} lessons</p>
                </div>
                <Button size="sm" onClick={handleAddSection} loading={createSection.isPending}>
                  <Icon name="add" size={14} />
                  Section
                </Button>
              </div>

              <div
                ref={curriculumScrollRef}
                className="flex-1 lg:overflow-y-auto p-3 space-y-2"
                style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Icon name="auto_awesome_mosaic" size={32} className="text-ink-300" />
                    <div>
                      <p className="text-sm text-ink-500 font-medium">No sections yet</p>
                      <p className="text-xs text-ink-300 mt-1">Add a section to start building your curriculum</p>
                    </div>
                    <Button size="sm" onClick={handleAddSection}>
                      <Icon name="add" size={14} />
                      Add First Section
                    </Button>
                  </div>
                ) : (
                  sections.map((section, sIdx) => {
                    const sectionLessons = lessons.filter((l) => l.section_id === section.id).sort((a, b) => a.position - b.position);
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <div key={section.id} className="bg-white border border-ink-300 rounded-md overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center gap-2 p-3">
                          <button onClick={() => toggleSection(section.id)} className="text-ink-500 hover:text-ink-700 flex-shrink-0">
                            <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="inline-flex">
                              <Icon name="chevron_right" size={16} />
                            </motion.span>
                          </button>
                          <span className="w-5 h-5 rounded-full bg-ink-100 text-ink-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {sIdx + 1}
                          </span>
                          <SectionTitleInput
                            section={section}
                            courseId={course.id}
                            onUpdate={(id, cId, title) => updateSection.mutate({ id, courseId: cId, title })}
                          />
                          <span className="text-[10px] text-ink-300 flex-shrink-0">{sectionLessons.length} lessons</span>
                          <button onClick={() => deleteSection.mutate({ id: section.id, courseId: course.id })}
                            className="p-1 text-ink-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <Icon name="delete" size={13} />
                          </button>
                        </div>

                        {/* Lessons */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="border-t border-ink-300 divide-y divide-ink-300">
                                {sectionLessons.map((lesson, lIdx) => (
                                  <button key={lesson.id} onClick={() => setEditingLesson(lesson)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-ink-100',
                                      editingLesson?.id === lesson.id && 'bg-brand-50 border-l-2 border-l-brand-400'
                                    )}>
                                    <span className="text-[10px] text-ink-300 w-4 flex-shrink-0">{lIdx + 1}</span>
                                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                                      lesson.lesson_type === 'video' ? 'bg-brand-50 text-brand-400' :
                                      lesson.lesson_type === 'image' ? 'bg-green-50 text-success' :
                                      lesson.lesson_type === 'text' ? 'bg-amber-500/15 text-amber-400' :
                                      'bg-ink-300 text-ink-500')}>
                                      <Icon name={lesson.lesson_type === 'video' ? 'smart_display' : lesson.lesson_type === 'image' ? 'image' : lesson.lesson_type === 'text' ? 'article' : 'attach_file'} size={12} fill />
                                    </div>
                                    <span className="text-xs text-ink-700 truncate flex-1">{lesson.title || 'Untitled'}</span>
                                    {lesson.is_preview && <span className="text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded flex-shrink-0">PREVIEW</span>}
                                    {lesson.video_duration_minutes > 0 && (
                                      <span className="text-[10px] text-ink-300 flex-shrink-0">{lesson.video_duration_minutes}m</span>
                                    )}
                                  </button>
                                ))}
                                <button onClick={() => handleAddLesson(section)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-300 hover:text-ink-700 hover:bg-ink-100 transition-colors">
                                  <Icon name="add" size={13} />
                                  Add Lesson
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Lesson editor panel */}
            {editingLesson && (
              <div className={cn('flex flex-col flex-1 min-w-0', editingLesson ? 'flex' : 'hidden')}>
                <LessonEditor
                  lesson={editingLesson}
                  onSave={handleSaveLesson}
                  onDelete={handleDeleteLesson}
                  onClose={() => setEditingLesson(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Details tab ── */}
        {activeTab === 'details' && (
          <div
            ref={detailsScrollRef}
            className="flex-1 lg:overflow-y-auto p-4 lg:p-8"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Cover */}
                <div>
                  <label className="text-xs font-medium text-ink-500 mb-2 block">Course Cover</label>
                  <CourseCoverUpload
                    courseId={course.id}
                    currentPath={course.cover_image}
                    onUploaded={(path) => updateCourse.mutate({ id: course.id, cover_image: path })}
                  />
                </div>

                {/* Basic info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-ink-500 mb-1 block">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Course title" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-500 mb-1 block">Short Description</label>
                    <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="One line summary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-500 mb-1 block">Category</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="e.g. AI Automation, Web Development, Design…"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-ink-500 mb-1 block">Level</label>
                      <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}
                        className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-500 mb-1 block">Language</label>
                      <input value={language} onChange={(e) => setLanguage(e.target.value)}
                        className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                        placeholder="English" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-500 mb-1 block">Full Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                  className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                  placeholder="Detailed course description" />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-500 mb-1 block">Tags (comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="design, ui, figma" />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-500 mb-1 block">What You'll Learn (one per line)</label>
                <textarea value={whatYouLearn} onChange={(e) => setWhatYouLearn(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                  placeholder="Build responsive websites&#10;Understand CSS Grid&#10;Create animations" />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-500 mb-1 block">Requirements (one per line)</label>
                <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 rounded-md bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
                  placeholder="Basic HTML knowledge&#10;A code editor installed" />
              </div>

              <Button onClick={saveCourseDetails} loading={saving} size="lg">
                <Icon name="save" size={16} />
                Save Details
              </Button>

              {/* ── Gallery section ── */}
              <div className="pt-4 border-t border-ink-200">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <Icon name="collections" size={16} className="text-brand-400" />
                    Course Gallery
                  </h3>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Upload images and short preview videos. Enrolled students will see this gallery on the course overview page.
                  </p>
                </div>
                <CourseGalleryEditor courseId={course.id} />
              </div>
            </div>
          </div>
        )}

        {/* ── Settings tab ── */}
        {activeTab === 'settings' && (
          <div
            ref={settingsScrollRef}
            className="flex-1 lg:overflow-y-auto p-4 lg:p-8"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <div className="max-w-lg mx-auto space-y-4">
              <h2 className="text-base font-semibold text-ink-900 mb-4">Course Settings</h2>

              {/* Visibility & publish */}
              <div className="bg-white border border-ink-300 rounded-lg p-5 space-y-0">

                {/* Published toggle */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">Published</p>
                    <p className="text-xs text-ink-500">Make this course live for students to enroll</p>
                  </div>
                  <button
                    onClick={handlePublish}
                    className={cn('w-11 h-6 rounded-full relative transition-colors flex-shrink-0', course.is_published ? 'bg-emerald-500' : 'bg-ink-300')}
                  >
                    <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', course.is_published ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>

                <div className="border-t border-ink-300" />

                {/* Hide from Explore toggle */}
                <div className="flex items-start justify-between py-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink-900 flex items-center gap-1.5">
                      Hide from Explore
                      {course.is_hidden && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">HIDDEN</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                      When enabled, this course will not appear in the Explore section.
                      Share links and enrolled students are not affected.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await updateCourse.mutateAsync({ id: course.id, is_hidden: !course.is_hidden });
                        toast.success(course.is_hidden ? 'Course visible in Explore' : 'Course hidden from Explore');
                      } catch { toast.error('Failed'); }
                    }}
                    className={cn('w-11 h-6 rounded-full relative transition-colors flex-shrink-0 mt-0.5', course.is_hidden ? 'bg-amber-500' : 'bg-ink-300')}
                  >
                    <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', course.is_hidden ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>

                <div className="border-t border-ink-300" />

                {/* Free badge */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">Free Course</p>
                    <p className="text-xs text-ink-500">This course is always free for everyone</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-success border border-green-200 rounded-full flex-shrink-0">Always Free</span>
                </div>
              </div>

              {/* Upload limits info */}
              <div className="bg-white border border-ink-300 rounded-lg p-5">
                <p className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                  <Icon name="upload" size={15} className="text-brand-400" />
                  Upload Limits
                </p>
                <div className="space-y-2">
                  {[
                    { icon: 'smart_display', label: 'Video files', limit: 'Up to 500 MB per video', color: 'text-brand-400' },
                    { icon: 'image', label: 'Image files', limit: 'Up to 100 MB per image', color: 'text-success' },
                    { icon: 'attach_file', label: 'Resource files', limit: 'Up to 100 MB per file', color: 'text-amber-400' },
                    { icon: 'add_photo_alternate', label: 'Cover image', limit: 'Up to 10 MB (JPG, PNG, WEBP)', color: 'text-pink-400' },
                  ].map(({ icon, label, limit, color }) => (
                    <div key={label} className="flex items-center gap-3 py-1.5">
                      <Icon name={icon} size={14} className={color} />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-ink-700">{label}</span>
                      </div>
                      <span className="text-xs text-ink-500">{limit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-5">
                <p className="text-sm font-medium text-ink-900 mb-1">Danger Zone</p>
                <p className="text-xs text-ink-500 mb-3">Permanently delete this course and all its content. This cannot be undone.</p>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this course permanently? All lessons, sections, and enrollments will be removed.')) return;
                    try {
                      await deleteCourse.mutateAsync(course.id);
                      toast.success('Course deleted');
                      navigate('/courses');
                    } catch { toast.error('Failed to delete course'); }
                  }}
                  className="px-4 py-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CourseShareModal
        open={shareOpen}
        courseId={course.id}
        courseTitle={course.title}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
