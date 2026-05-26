import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCourse, useUpdateCourse, useCourseSections, useCourseLessons,
  useCreateSection, useUpdateSection, useDeleteSection,
  useCreateLesson, useUpdateLesson, useDeleteLesson,
} from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import type { CourseSection, CourseLesson } from '../hooks/useCourses';

const CATEGORIES = ['General', 'Design', 'Development', 'Marketing', 'Business', 'Photography', 'Music', 'Health', 'Other'];

// ── Cover upload ──────────────────────────────────────────────────────────────

function CourseCoverUpload({ courseId, currentPath, onUploaded }: {
  courseId: string;
  currentPath: string | null;
  onUploaded: (path: string) => void;
}) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentPath) return;
    supabase.storage.from('prompt-media').createSignedUrl(currentPath, 3600)
      .then(({ data }) => data?.signedUrl && setUrl(data.signedUrl))
      .catch(() => {});
  }, [currentPath]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `covers/${user!.id}/${courseId}.${ext}`;
      const { error } = await supabase.storage.from('prompt-media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from('prompt-media').createSignedUrl(path, 3600);
      if (data?.signedUrl) setUrl(data.signedUrl);
      onUploaded(path);
      toast.success('Cover updated');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer group"
      onClick={() => inputRef.current?.click()}
    >
      {url ? (
        <img src={url} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
          <Icon name="add_photo_alternate" size={32} />
          <span className="text-sm">Click to upload cover image</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-medium">
        {uploading ? (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <><Icon name="upload" size={16} /> Change Cover</>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Lesson editor ─────────────────────────────────────────────────────────────

type LessonTab = 'content' | 'resources';

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
  const [tab, setTab] = useState<LessonTab>('content');
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [content, setContent] = useState(lesson.content);
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [durationMin, setDurationMin] = useState(String(lesson.video_duration_minutes || ''));
  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState(lesson.resources ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `courses/${user!.id}/${lesson.course_id}/lessons/${lesson.id}/${file.name}`;
      const { error } = await supabase.storage.from('prompt-media').upload(path, file, { upsert: true });
      if (error) throw error;
      onSave({ video_path: path, title, description, lesson_type: lessonType, content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0 });
      toast.success('Video uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleResourceUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `courses/${user!.id}/${lesson.course_id}/resources/${lesson.id}/${file.name}`;
      const { error } = await supabase.storage.from('prompt-media').upload(path, file, { upsert: true });
      if (error) throw error;
      const newRes = [...resources, { name: file.name, path, size: file.size, mime_type: file.type }];
      setResources(newRes);
      onSave({ resources: newRes });
      toast.success('Resource uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const removeResource = (idx: number) => {
    const newRes = resources.filter((_, i) => i !== idx);
    setResources(newRes);
    onSave({ resources: newRes });
  };

  const save = () => onSave({
    title, description, lesson_type: lessonType, video_url: videoUrl || null,
    content, is_preview: isPreview, video_duration_minutes: parseFloat(durationMin) || 0,
    resources,
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-white text-sm truncate flex-1 mr-3">{title || 'Untitled Lesson'}</h3>
        <div className="flex items-center gap-1.5">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Icon name="delete" size={15} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors">
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {([['content', 'Content'], ['resources', 'Resources']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === key ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'content' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lesson title" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  ['video', 'smart_display', 'Video'],
                  ['image', 'image', 'Image'],
                  ['text', 'article', 'Text'],
                  ['resource', 'attach_file', 'File'],
                ] as const).map(([type, icon, label]) => (
                  <button key={type} onClick={() => setLessonType(type)}
                    className={cn('flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all',
                      lessonType === type ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                    )}>
                    <Icon name={icon} size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {lessonType === 'video' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">External Video URL</label>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="YouTube / Vimeo URL" />
                </div>
                <p className="text-xs text-gray-600 text-center">or</p>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full h-10 border border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2">
                  {uploading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <Icon name="upload" size={14} />}
                  Upload Video File
                </button>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Duration (minutes)</label>
                  <input value={durationMin} onChange={(e) => setDurationMin(e.target.value)} type="number" min="0"
                    className="w-full h-9 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 12.5" />
                </div>
              </div>
            )}

            {(lessonType === 'text' || lessonType === 'image') && (
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  {lessonType === 'text' ? 'Lesson Content (Markdown)' : 'Description / Caption'}
                </label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={lessonType === 'text' ? '# Your lesson content\n\nWrite in markdown...' : 'Caption or notes...'} />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Brief lesson description" />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={cn('w-9 h-5 rounded-full relative transition-colors', isPreview ? 'bg-blue-600' : 'bg-gray-700')}
                onClick={() => setIsPreview((v) => !v)}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', isPreview ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-300">Free Preview</span>
                <p className="text-xs text-gray-500">Visible before enrollment</p>
              </div>
            </label>
          </>
        )}

        {tab === 'resources' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Attach downloadable files (PDFs, ZIPs, code, etc.)</p>
            <button onClick={() => resInputRef.current?.click()}
              className="w-full h-10 border border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2">
              {uploading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <Icon name="attach_file" size={14} />}
              Upload Resource File
            </button>
            <input ref={resInputRef} type="file" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleResourceUpload(e.target.files[0])} />

            {resources.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6 italic">No resources attached</p>
            ) : (
              <div className="space-y-2">
                {resources.map((res, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-800 rounded-xl">
                    <Icon name="attach_file" size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300 truncate flex-1">{res.name}</span>
                    <button onClick={() => removeResource(i)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        <Button className="w-full" onClick={save}>
          <Icon name="save" size={14} />
          Save Lesson
        </Button>
      </div>
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

  // Course fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [category, setCategory] = useState('General');
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
      const updated = await updateLesson.mutateAsync({ id: editingLesson.id, ...patch });
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <svg className="h-8 w-8 animate-spin text-blue-400 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-500 text-sm">Loading editor...</p>
      </div>
    </div>
  );

  if (!course) return <div className="p-8 text-center text-gray-400">Course not found.</div>;
  if (course.user_id !== user?.id) return <div className="p-8 text-center text-gray-400">Access denied.</div>;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 py-3 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/courses')} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <Icon name="arrow_back" size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{course.title || 'Untitled Course'}</h1>
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', course.is_published ? 'text-emerald-300 bg-emerald-500/15' : 'text-gray-400 bg-gray-700/50')}>
                {course.is_published ? 'PUBLISHED' : 'DRAFT'}
              </span>
              {totalMin > 0 && <span className="text-[11px] text-gray-500">{Math.round(totalMin)}m total</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handlePublish}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              course.is_published
                ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
            )}>
            {course.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={() => navigate(`/courses/${course.id}/learn`)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors">
            Preview
          </button>
        </div>
      </div>

      {/* Editor tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0">
        {([
          ['structure', 'auto_awesome_mosaic', 'Curriculum'],
          ['details', 'info', 'Details'],
          ['settings', 'tune', 'Settings'],
        ] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === key ? 'text-blue-400 border-blue-500 bg-blue-600/5' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'
            )}>
            <Icon name={icon} size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Curriculum tab ── */}
        {activeTab === 'structure' && (
          <div className="flex flex-1 min-w-0 overflow-hidden">
            {/* Section/lesson tree */}
            <div className={cn('flex flex-col bg-gray-950 border-r border-gray-800 overflow-y-auto', editingLesson ? 'w-80 flex-shrink-0 hidden lg:flex' : 'flex-1')}>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-white">Curriculum</h2>
                  <p className="text-xs text-gray-500">{sections.length} sections · {lessons.length} lessons</p>
                </div>
                <Button size="sm" onClick={handleAddSection} loading={createSection.isPending}>
                  <Icon name="add" size={14} />
                  Section
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Icon name="auto_awesome_mosaic" size={32} className="text-gray-700" />
                    <div>
                      <p className="text-sm text-gray-400 font-medium">No sections yet</p>
                      <p className="text-xs text-gray-600 mt-1">Add a section to start building your curriculum</p>
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
                      <div key={section.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        {/* Section header */}
                        <div className="flex items-center gap-2 p-3">
                          <button onClick={() => toggleSection(section.id)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                            <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="inline-flex">
                              <Icon name="chevron_right" size={16} />
                            </motion.span>
                          </button>
                          <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {sIdx + 1}
                          </span>
                          <input
                            value={section.title}
                            onChange={(e) => updateSection.mutate({ id: section.id, courseId: course.id, title: e.target.value })}
                            className="flex-1 bg-transparent text-sm font-semibold text-gray-200 focus:outline-none placeholder-gray-600 min-w-0"
                            placeholder="Section title"
                          />
                          <span className="text-[10px] text-gray-600 flex-shrink-0">{sectionLessons.length} lessons</span>
                          <button onClick={() => deleteSection.mutate({ id: section.id, courseId: course.id })}
                            className="p-1 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                            <Icon name="delete" size={13} />
                          </button>
                        </div>

                        {/* Lessons */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="border-t border-gray-800 divide-y divide-gray-800/60">
                                {sectionLessons.map((lesson, lIdx) => (
                                  <button key={lesson.id} onClick={() => setEditingLesson(lesson)}
                                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-800/50',
                                      editingLesson?.id === lesson.id && 'bg-blue-600/10 border-l-2 border-l-blue-500'
                                    )}>
                                    <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">{lIdx + 1}</span>
                                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                                      lesson.lesson_type === 'video' ? 'bg-blue-500/15 text-blue-400' :
                                      lesson.lesson_type === 'image' ? 'bg-emerald-500/15 text-emerald-400' :
                                      lesson.lesson_type === 'text' ? 'bg-amber-500/15 text-amber-400' :
                                      'bg-gray-700 text-gray-400')}>
                                      <Icon name={lesson.lesson_type === 'video' ? 'smart_display' : lesson.lesson_type === 'image' ? 'image' : lesson.lesson_type === 'text' ? 'article' : 'attach_file'} size={12} fill />
                                    </div>
                                    <span className="text-xs text-gray-300 truncate flex-1">{lesson.title || 'Untitled'}</span>
                                    {lesson.is_preview && <span className="text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded flex-shrink-0">PREVIEW</span>}
                                    {lesson.video_duration_minutes > 0 && (
                                      <span className="text-[10px] text-gray-600 flex-shrink-0">{lesson.video_duration_minutes}m</span>
                                    )}
                                  </button>
                                ))}
                                <button onClick={() => handleAddLesson(section)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-600 hover:text-gray-300 hover:bg-gray-800/40 transition-colors">
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
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Cover */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Course Cover</label>
                  <CourseCoverUpload
                    courseId={course.id}
                    currentPath={course.cover_image}
                    onUploaded={(path) => updateCourse.mutate({ id: course.id, cover_image: path })}
                  />
                </div>

                {/* Basic info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Course title" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Short Description</label>
                    <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="One line summary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">Level</label>
                      <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}
                        className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">Language</label>
                      <input value={language} onChange={(e) => setLanguage(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="English" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Full Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detailed course description" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Tags (comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="design, ui, figma" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">What You'll Learn (one per line)</label>
                <textarea value={whatYouLearn} onChange={(e) => setWhatYouLearn(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Build responsive websites&#10;Understand CSS Grid&#10;Create animations" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Requirements (one per line)</label>
                <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Basic HTML knowledge&#10;A code editor installed" />
              </div>

              <Button onClick={saveCourseDetails} loading={saving} size="lg">
                <Icon name="save" size={16} />
                Save Details
              </Button>
            </div>
          </div>
        )}

        {/* ── Settings tab ── */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-lg mx-auto space-y-4">
              <h2 className="text-base font-semibold text-white mb-4">Course Settings</h2>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Published</p>
                    <p className="text-xs text-gray-500">Visible to all users when published</p>
                  </div>
                  <button onClick={handlePublish}
                    className={cn('w-11 h-6 rounded-full relative transition-colors', course.is_published ? 'bg-emerald-500' : 'bg-gray-700')} >
                    <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', course.is_published ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">Free Course</p>
                    <p className="text-xs text-gray-500">This course is always free</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full">Always Free</span>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5">
                <p className="text-sm font-medium text-white mb-1">Danger Zone</p>
                <p className="text-xs text-gray-500 mb-3">Permanently delete this course and all its content.</p>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this course permanently?')) return;
                    try {
                      await updateCourse.mutateAsync({ id: course.id, is_published: false });
                      navigate('/courses');
                    } catch { toast.error('Failed'); }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
