import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useExploreCourses, useMyCourses, useMyEnrollments,
  useEnroll, useCreateCourse, useDeleteCourse,
} from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { usePublicProfile, getAvatarUrl } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { CourseShareModal } from '../components/courses/CourseShareModal';
import { cn, formatRelative } from '../lib/utils';
import type { Course } from '../hooks/useCourses';

const CATEGORIES = ['All', 'General', 'Design', 'Development', 'Marketing', 'Business', 'Photography', 'Music', 'Health', 'Other'];
const LEVELS = ['All', 'beginner', 'intermediate', 'advanced'];

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700 border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
};

function CourseCover({ course, className = '' }: { course: Course; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!course.cover_image);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!course.cover_image) { setLoading(false); return; }
    setLoading(true);
    setFailed(false);
    supabase.storage.from('prompt-media').createSignedUrl(course.cover_image, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setFailed(true); } else { setUrl(data.signedUrl); }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [course.cover_image]);

  if (loading) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-ink-200 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[skeleton-sweep_1.8s_ease-in-out_infinite] ${className}`} />
    );
  }
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={course.title}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-ink-100 to-ink-200 ${className}`}>
      <Icon name="school" size={32} className="text-ink-400" />
    </div>
  );
}

function CreatorBadge({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  const name = profile?.display_name || 'Instructor';
  const hasAvatar = !!profile?.avatar_path;

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-400 to-brand-600 border border-white">
        {hasAvatar ? (
          <img src={getAvatarUrl(profile!.avatar_path!)} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">
            {name[0]?.toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-[11px] text-ink-500 truncate max-w-[100px]">{name}</span>
    </div>
  );
}

function CourseCard({
  course, isEnrolled, isOwner, onEnroll, onOpen, onEdit, onDelete, onShare,
}: {
  course: Course;
  isEnrolled: boolean;
  isOwner: boolean;
  onEnroll: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative bg-white border border-ink-300 rounded-lg overflow-hidden',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150',
        course.is_hidden && isOwner && 'opacity-60',
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-ink-100">
        <CourseCover course={course} />

        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', LEVEL_COLORS[course.level] ?? LEVEL_COLORS.beginner)}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
            FREE
          </span>
        </div>

        {isOwner && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="w-7 h-7 bg-white/90 hover:bg-white rounded-md shadow-sm flex items-center justify-center text-ink-700 opacity-0 group-hover:opacity-100 transition-all border border-ink-300"
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
                    className="absolute right-0 top-8 z-20 bg-white border border-ink-300 rounded-lg shadow-xl py-1 min-w-[140px]"
                  >
                    <button onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 transition-colors">
                      <Icon name="edit" size={13} /> Edit Course
                    </button>
                    <button onClick={() => { setMenuOpen(false); onShare(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 transition-colors">
                      <Icon name="share" size={13} /> Share Course
                    </button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 transition-colors">
                      <Icon name="delete" size={13} /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {isOwner && (
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            {course.is_hidden && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-ink-700 border border-ink-300 flex items-center gap-1">
                <Icon name="visibility_off" size={9} /> Hidden
              </span>
            )}
            {!course.is_published ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-ink-500 border border-ink-300">DRAFT</span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">PUBLISHED</span>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[11px] text-brand-400 font-medium">{course.category}</span>
          <span className="text-[11px] text-ink-500">{formatRelative(course.created_at)}</span>
        </div>
        <h3 className="font-bold text-ink-900 text-sm leading-snug line-clamp-2 mb-1">
          {course.title || 'Untitled Course'}
        </h3>
        <p className="text-xs text-ink-500 line-clamp-2 leading-relaxed mb-3">
          {course.short_description || course.description || 'No description yet.'}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-ink-500 mb-2">
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
          {(course.reviews_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 font-semibold text-ink-700">
              <Icon name="star" size={11} fill className="text-amber-400" />
              {(course.avg_rating ?? 0).toFixed(1)}
              <span className="text-ink-400 font-normal">({course.reviews_count})</span>
            </span>
          )}
        </div>

        {!isOwner && (
          <div className="mb-3 pt-2 border-t border-ink-100">
            <CreatorBadge userId={course.user_id} />
          </div>
        )}

        {isOwner ? (
          <Button size="sm" variant="secondary" className="w-full" onClick={onEdit}>
            <Icon name="edit" size={13} />
            Manage Course
          </Button>
        ) : isEnrolled ? (
          <Button size="sm" variant="primary" className="w-full" onClick={onOpen}>
            <Icon name="play_circle" size={13} />
            Continue Learning
          </Button>
        ) : (
          <Button size="sm" variant="primary" className="w-full" onClick={onEnroll}>
            <Icon name="school" size={13} />
            Enroll Free
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg overflow-hidden border border-ink-300 animate-pulse">
          <div className="aspect-video bg-ink-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-ink-100 rounded w-3/4" />
            <div className="h-4 bg-ink-100 rounded" />
            <div className="h-4 bg-ink-100 rounded w-2/3" />
            <div className="h-9 bg-ink-100 rounded-md mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-sm bg-white border border-ink-300 rounded-lg shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Icon name="school" size={20} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-display font-bold text-ink-900">New Course</h2>
            <p className="text-xs text-ink-500">You'll be taken to the editor</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-ink-700 mb-1 block">Course Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Introduction to Web Design"
              className="w-full h-11 px-3 rounded-md bg-white border border-ink-300 text-ink-900 placeholder-ink-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-700 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-md bg-white border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
            >
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-md border border-ink-300 text-ink-700 hover:bg-ink-100 text-sm transition-colors"
          >
            Cancel
          </button>
          <Button variant="primary" onClick={handleCreate} disabled={!title.trim()} loading={createCourse.isPending} className="flex-1">
            Create & Edit
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

type Tab = 'explore' | 'my' | 'enrolled';

export function CoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: exploreCourses = [], isLoading: exploreLoading } = useExploreCourses();
  const { data: myCourses = [], isLoading: myLoading } = useMyCourses();
  const { data: enrollments = [] } = useMyEnrollments();
  const enroll = useEnroll();
  const deleteCourse = useDeleteCourse();

  const [tab, setTab] = useState<Tab>('explore');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [newCourseOpen, setNewCourseOpen] = useState(false);
  const [sharingCourse, setSharingCourse] = useState<Course | null>(null);

  const enrolledIds = new Set(enrollments.map((e) => e.course_id));

  const filter = (list: Course[]) => {
    let out = list;
    if (search) out = out.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    );
    if (category !== 'All') out = out.filter((c) => c.category === category);
    if (level !== 'All') out = out.filter((c) => c.level === level);
    return out;
  };

  const displayCourses = (() => {
    if (tab === 'my') return filter(myCourses);
    if (tab === 'enrolled') return filter(exploreCourses.filter((c) => enrolledIds.has(c.id)));
    return filter(exploreCourses);
  })();

  const isLoading = tab === 'my' ? myLoading : exploreLoading;

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

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'explore', label: 'Explore', icon: 'explore', count: exploreCourses.length },
    { key: 'my', label: 'My Courses', icon: 'school', count: myCourses.length },
    { key: 'enrolled', label: 'Enrolled', icon: 'check_circle', count: enrollments.length },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-ink-900 border-b border-ink-700">
        <div className="px-4 lg:px-8 py-8 lg:py-10 max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-brand-400 rounded-md flex items-center justify-center">
                  <Icon name="school" size={17} className="text-white" fill />
                </div>
                <span className="text-xs font-bold text-brand-300 uppercase tracking-widest">Learning Hub</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-white tracking-tight mb-1">Courses</h1>
              <p className="text-ink-300 text-sm">Discover, enroll, and learn from free courses.</p>
            </div>
            <Button variant="primary" onClick={() => setNewCourseOpen(true)} size="lg">
              <Icon name="add" size={18} />
              Create Course
            </Button>
          </div>

          <div className="flex gap-3 mt-6 flex-wrap">
            {[
              { label: 'Available', value: exploreCourses.length, icon: 'public' },
              { label: 'My Courses', value: myCourses.length, icon: 'school' },
              { label: 'Enrolled', value: enrollments.length, icon: 'check_circle' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md">
                <Icon name={s.icon} size={13} className="text-ink-300" />
                <span className="text-sm font-bold text-white">{s.value}</span>
                <span className="text-xs text-ink-300">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-ink-300">
        <div className="px-4 lg:px-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-0 pt-3 pb-0 overflow-x-auto">
            {tabs.map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                  tab === key
                    ? 'text-brand-400 border-brand-400'
                    : 'text-ink-500 border-transparent hover:text-ink-900 hover:border-ink-300',
                )}
              >
                <Icon name={icon} size={14} />
                {label}
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    tab === key ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-500',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 py-3">
            <div className="relative flex-1">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full h-9 pl-9 pr-3 rounded-md bg-white border border-ink-300 text-ink-900 placeholder-ink-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 px-3 rounded-md bg-white border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-9 px-3 rounded-md bg-white border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l === 'All' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        {tab === 'my' && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-ink-500 flex items-center gap-2">
              <Icon name="school" size={15} className="text-brand-400" />
              Your created courses (including drafts and hidden ones)
            </p>
            <Button size="sm" variant="primary" onClick={() => setNewCourseOpen(true)}>
              <Icon name="add" size={13} />
              New Course
            </Button>
          </div>
        )}

        {isLoading ? (
          <SkeletonGrid />
        ) : displayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-ink-100 border border-ink-300 rounded-lg flex items-center justify-center mb-4">
              <Icon name={tab === 'explore' ? 'explore' : tab === 'my' ? 'school' : 'check_circle'} size={28} className="text-ink-300" />
            </div>
            <h3 className="text-lg font-display font-bold text-ink-900 tracking-tight mb-2">
              {tab === 'my' ? 'No courses created yet'
                : tab === 'enrolled' ? 'Not enrolled in any courses'
                : search || category !== 'All' || level !== 'All' ? 'No courses match your filters'
                : 'No courses available yet'}
            </h3>
            <p className="text-ink-500 text-sm mb-5">
              {tab === 'my' ? 'Create your first course to start teaching.'
                : tab === 'enrolled' ? 'Explore the course catalog and enroll in something new.'
                : 'Check back soon or create a course yourself.'}
            </p>
            {tab === 'my' && (
              <Button variant="primary" onClick={() => setNewCourseOpen(true)}>
                <Icon name="add" size={16} />
                Create Your First Course
              </Button>
            )}
            {tab === 'enrolled' && (
              <Button variant="primary" onClick={() => setTab('explore')}>
                <Icon name="explore" size={16} />
                Browse Courses
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
                onShare={() => setSharingCourse(course)}
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

      <AnimatePresence>
        {sharingCourse && (
          <CourseShareModal
            open={!!sharingCourse}
            courseId={sharingCourse.id}
            courseTitle={sharingCourse.title}
            onClose={() => setSharingCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
