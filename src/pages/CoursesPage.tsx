import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useCourses, useMyCourses, useMyEnrollments, useEnroll, useCreateCourse, useDeleteCourse } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn, formatRelative } from '../lib/utils';
import type { Course } from '../hooks/useCourses';

const CATEGORIES = ['All', 'General', 'Design', 'Development', 'Marketing', 'Business', 'Photography', 'Music', 'Health', 'Other'];
const LEVELS = ['All', 'beginner', 'intermediate', 'advanced'];

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  advanced: 'bg-red-500/15 text-red-300 border-red-500/25',
};

// ── Cover image helper ────────────────────────────────────────────────────────

function CourseCover({ course, className = '' }: { course: Course; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!course.cover_image) return;
    supabase.storage.from('prompt-media').createSignedUrl(course.cover_image, 3600)
      .then(({ data }) => data?.signedUrl && setUrl(data.signedUrl))
      .catch(() => {});
  }, [course.cover_image]);

  if (url) return <img src={url} alt={course.title} className={`w-full h-full object-cover ${className}`} />;
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 ${className}`}>
      <Icon name="school" size={32} className="text-gray-600" />
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────

function CourseCard({
  course,
  isEnrolled,
  isOwner,
  onEnroll,
  onOpen,
  onEdit,
  onDelete,
}: {
  course: Course;
  isEnrolled: boolean;
  isOwner: boolean;
  onEnroll: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden">
        <CourseCover course={course} />
        {/* Badges overlay */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', LEVEL_COLORS[course.level] ?? LEVEL_COLORS.beginner)}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
            FREE
          </span>
        </div>
        {/* Owner menu */}
        {isOwner && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-7 h-7 bg-black/60 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            >
              <Icon name="more_vert" size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[130px]"
                  >
                    <button onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                      <Icon name="edit" size={13} /> Edit Course
                    </button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Icon name="delete" size={13} /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Draft badge */}
        {isOwner && !course.is_published && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
              DRAFT
            </span>
          </div>
        )}
        {/* Published badge for owner */}
        {isOwner && course.is_published && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PUBLISHED
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[11px] text-blue-400 font-medium">{course.category}</span>
          <span className="text-[11px] text-gray-500">{formatRelative(course.created_at)}</span>
        </div>
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-1 group-hover:text-blue-200 transition-colors">
          {course.title || 'Untitled Course'}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
          {course.short_description || course.description || 'No description yet.'}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
          {course.total_duration_minutes > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="schedule" size={11} />
              {course.total_duration_minutes}m
            </span>
          )}
          {course.language && (
            <span className="flex items-center gap-1">
              <Icon name="language" size={11} />
              {course.language}
            </span>
          )}
        </div>

        {/* CTA */}
        {isOwner ? (
          <Button size="sm" className="w-full" onClick={onEdit}>
            <Icon name="edit" size={13} />
            Manage Course
          </Button>
        ) : isEnrolled ? (
          <Button size="sm" className="w-full" onClick={onOpen}>
            <Icon name="play_circle" size={13} />
            Continue Learning
          </Button>
        ) : (
          <button
            onClick={onEnroll}
            className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="school" size={13} />
            Enroll Free
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── New course modal ──────────────────────────────────────────────────────────

function NewCourseModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (id: string) => void;
}) {
  const createCourse = useCreateCourse();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const course = await createCourse.mutateAsync({ title: title.trim(), category });
      toast.success('Course created!');
      onCreate(course.id);
    } catch {
      toast.error('Failed to create course');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Icon name="school" size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">New Course</h2>
            <p className="text-xs text-gray-500">You'll be taken to the editor</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Course Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Introduction to Web Design"
              className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors">
            Cancel
          </button>
          <Button onClick={handleCreate} disabled={!title.trim()} loading={createCourse.isPending} className="flex-1">
            Create & Edit
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();
  const { data: myCourses = [] } = useMyCourses();
  const { data: enrollments = [] } = useMyEnrollments();
  const enroll = useEnroll();
  const deleteCourse = useDeleteCourse();

  const [tab, setTab] = useState<'all' | 'my' | 'enrolled'>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [newCourseOpen, setNewCourseOpen] = useState(false);

  const enrolledIds = new Set(enrollments.map((e) => e.course_id));
  const myIds = new Set(myCourses.map((c) => c.id));

  const displayCourses = (() => {
    let list = tab === 'my' ? myCourses
      : tab === 'enrolled' ? courses.filter((c) => enrolledIds.has(c.id))
      : courses;

    if (search) list = list.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'All') list = list.filter((c) => c.category === category);
    if (level !== 'All') list = list.filter((c) => c.level === level);
    return list;
  })();

  const handleEnroll = async (courseId: string) => {
    try {
      await enroll.mutateAsync(courseId);
      toast.success('Enrolled! Start learning.');
      navigate(`/courses/${courseId}/learn`);
    } catch {
      toast.error('Failed to enroll');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Delete this course and all its content? This cannot be undone.')) return;
    try {
      await deleteCourse.mutateAsync(courseId);
      toast.success('Course deleted');
    } catch {
      toast.error('Failed to delete course');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-b border-gray-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-600/5 rounded-full blur-3xl" />
        </div>
        <div className="relative px-4 lg:px-8 py-8 lg:py-10 max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Icon name="school" size={17} className="text-white" fill />
                </div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Learning Hub</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Courses</h1>
              <p className="text-gray-400 text-sm">Create and share free courses with your students.</p>
            </div>
            <Button onClick={() => setNewCourseOpen(true)} size="lg">
              <Icon name="add" size={18} />
              Create Course
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-6 flex-wrap">
            {[
              { label: 'Published', value: courses.filter((c) => c.is_published).length, icon: 'public' },
              { label: 'My Courses', value: myCourses.length, icon: 'school' },
              { label: 'Enrolled', value: enrollments.length, icon: 'check_circle' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                <Icon name={s.icon} size={14} className="text-gray-400" />
                <span className="text-sm font-bold text-white">{s.value}</span>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 lg:px-8 py-3 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Tabs */}
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1 flex-shrink-0">
              {([['all', 'All Courses'], ['my', 'My Courses'], ['enrolled', 'Enrolled']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tab === key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              />
            </div>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* Level */}
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-9 px-3 rounded-xl bg-gray-900 border border-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l === 'All' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 animate-pulse">
                <div className="aspect-video bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                  <div className="h-8 bg-gray-800 rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-800/60 rounded-2xl flex items-center justify-center mb-4">
              <Icon name="school" size={28} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {tab === 'my' ? 'No courses created yet' : tab === 'enrolled' ? 'Not enrolled in any courses' : 'No courses found'}
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              {tab === 'my' ? 'Create your first course to start teaching.' : 'Browse courses or create your own.'}
            </p>
            {tab === 'my' && (
              <Button onClick={() => setNewCourseOpen(true)}>
                <Icon name="add" size={16} />
                Create Your First Course
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={enrolledIds.has(course.id)}
                isOwner={course.user_id === user?.id}
                onEnroll={() => handleEnroll(course.id)}
                onOpen={() => navigate(`/courses/${course.id}/learn`)}
                onEdit={() => navigate(`/courses/${course.id}/edit`)}
                onDelete={() => handleDelete(course.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {newCourseOpen && (
          <NewCourseModal
            open={newCourseOpen}
            onClose={() => setNewCourseOpen(false)}
            onCreate={(id) => { setNewCourseOpen(false); navigate(`/courses/${id}/edit`); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
