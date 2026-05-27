import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { escapePostgrestLike } from '../lib/safeFilters';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  user_id: string;
  title: string;
  description: string;
  short_description: string;
  cover_image: string | null;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  tags: string[];
  is_published: boolean;
  is_free: boolean;
  is_hidden: boolean;
  total_duration_minutes: number;
  requirements: string[];
  what_you_learn: string[];
  avg_rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

export interface LessonResource {
  name: string;
  path: string;
  size: number;
  mime_type?: string;
}

export interface TimelineMarker {
  time_seconds: number;
  label: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  section_id: string;
  user_id: string;
  title: string;
  description: string;
  lesson_type: 'video' | 'image' | 'resource' | 'text';
  video_path: string | null;
  video_url: string | null;
  video_duration_minutes: number;
  content: string;
  position: number;
  is_preview: boolean;
  resources: LessonResource[];
  timeline_markers: TimelineMarker[];
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  last_accessed_at: string;
}

export interface LessonProgress {
  id: string;
  lesson_id: string;
  course_id: string;
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  watch_position_seconds: number;
}

export interface CourseNote {
  id: string;
  course_id: string;
  lesson_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CourseCertificate {
  id: string;
  course_id: string;
  user_id: string;
  certificate_number: string;
  issued_at: string;
  department: string;
  internship_from: string | null;
  internship_to: string | null;
  growth_area: string;
  instructor_name: string;
  student_name: string;
  course_title: string;
  course_category: string;
  serial_number: string;
  share_slug: string | null;
  share_view_count: number;
}

// ── Course queries ────────────────────────────────────────────────────────────

// All published, non-hidden courses — for Explore tab
export function useExploreCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['explore-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
  });
}

// Legacy — kept for backwards compat; returns all courses visible to user
export function useCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });
}

export function useMyCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
  });
}

export function useCourse(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateCourse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Course>) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Course> & { id: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Course;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['course', data.id] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
      return courseId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}

// ── Sections ──────────────────────────────────────────────────────────────────

export function useCourseSections(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-sections', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as CourseSection[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, title, position }: { courseId: string; title: string; position: number }) => {
      const { data, error } = await supabase
        .from('course_sections')
        .insert({ course_id: courseId, user_id: user!.id, title, position })
        .select()
        .single();
      if (error) throw error;
      return data as CourseSection;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-sections', data.course_id] }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, ...patch }: Partial<CourseSection> & { id: string; courseId: string }) => {
      const { data, error } = await supabase
        .from('course_sections')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data as CourseSection, courseId };
    },
    onMutate: async ({ id, courseId, ...patch }) => {
      await qc.cancelQueries({ queryKey: ['course-sections', courseId] });
      const prev = qc.getQueryData<CourseSection[]>(['course-sections', courseId]);
      qc.setQueryData<CourseSection[]>(['course-sections', courseId], (old) =>
        old?.map((s) => s.id === id ? { ...s, ...patch } : s) ?? []
      );
      return { prev, courseId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['course-sections', ctx.courseId], ctx.prev);
    },
    onSettled: (_data, _err, { courseId }) => {
      qc.invalidateQueries({ queryKey: ['course-sections', courseId] });
    },
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('course_sections').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ['course-sections', courseId] }),
  });
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export function useCourseLessons(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as CourseLesson[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateLesson() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CourseLesson> & { course_id: string; section_id: string }) => {
      const { data, error } = await supabase
        .from('course_lessons')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CourseLesson;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-lessons', data.course_id] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CourseLesson> & { id: string }) => {
      const { data, error } = await supabase
        .from('course_lessons')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CourseLesson;
    },
    onMutate: async ({ id, ...patch }) => {
      const lesson = qc.getQueryData<CourseLesson[]>(['course-lessons'])?.find((l) => l.id === id);
      const courseId = (patch as Partial<CourseLesson>).course_id ?? lesson?.course_id;
      if (!courseId) return;
      await qc.cancelQueries({ queryKey: ['course-lessons', courseId] });
      const prev = qc.getQueryData<CourseLesson[]>(['course-lessons', courseId]);
      qc.setQueryData<CourseLesson[]>(['course-lessons', courseId], (old) =>
        old?.map((l) => l.id === id ? { ...l, ...patch } : l) ?? []
      );
      return { prev, courseId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx.courseId) qc.setQueryData(['course-lessons', ctx.courseId], ctx.prev);
    },
    onSettled: (data) => {
      if (data?.course_id) qc.invalidateQueries({ queryKey: ['course-lessons', data.course_id] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('course_lessons').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ['course-lessons', courseId] }),
  });
}

// ── Enrollment ────────────────────────────────────────────────────────────────

export function useMyEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as CourseEnrollment[];
    },
    enabled: !!user,
  });
}

export function useEnrollment(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['enrollment', courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as CourseEnrollment | null;
    },
    enabled: !!user && !!courseId,
  });
}

export function useEnroll() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({ course_id: courseId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CourseEnrollment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['enrollment', data.course_id] });
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
    },
  });
}

// ── Lesson Progress ───────────────────────────────────────────────────────────

export function useCourseProgress(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-progress', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as LessonProgress[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useMarkLessonComplete() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, courseId, watchPositionSeconds = 0 }: {
      lessonId: string;
      courseId: string;
      watchPositionSeconds?: number;
    }) => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          course_id: courseId,
          user_id: user!.id,
          completed: true,
          completed_at: new Date().toISOString(),
          watch_position_seconds: watchPositionSeconds,
        }, { onConflict: 'lesson_id,user_id' })
        .select()
        .single();
      if (error) throw error;

      // Try to issue certificate
      await supabase.rpc('issue_certificate_if_complete', {
        p_course_id: courseId,
        p_user_id: user!.id,
      });

      return data as LessonProgress;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['course-progress', data.course_id] });
      qc.invalidateQueries({ queryKey: ['enrollment', data.course_id] });
      qc.invalidateQueries({ queryKey: ['my-certificate', data.course_id, user?.id] });
    },
  });
}

export function useSaveWatchPosition() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lessonId, courseId, seconds }: {
      lessonId: string;
      courseId: string;
      seconds: number;
    }) => {
      await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          course_id: courseId,
          user_id: user!.id,
          watch_position_seconds: seconds,
        }, { onConflict: 'lesson_id,user_id' });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useLessonNotes(courseId: string, lessonId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-notes', courseId, lessonId, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('course_notes')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (lessonId) q = q.eq('lesson_id', lessonId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CourseNote[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId, content }: {
      courseId: string;
      lessonId?: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('course_notes')
        .insert({ course_id: courseId, lesson_id: lessonId ?? null, user_id: user!.id, content })
        .select()
        .single();
      if (error) throw error;
      return data as CourseNote;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-notes', data.course_id] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, courseId }: { id: string; content: string; courseId: string }) => {
      const { data, error } = await supabase
        .from('course_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as CourseNote), courseId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-notes', data.course_id] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('course_notes').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ['course-notes', courseId] }),
  });
}

// ── Certificate ───────────────────────────────────────────────────────────────

export function useMyCertificate(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-certificate', courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_certificates')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as CourseCertificate | null;
    },
    enabled: !!user && !!courseId,
    staleTime: 0,
  });
}

export function useAllMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-my-certificates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_certificates')
        .select('*')
        .eq('user_id', user!.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as CourseCertificate[];
    },
    enabled: !!user,
  });
}

// ── Certificate Issuance ─────────────────────────────────────────────────────

export interface IssueCertificateInput {
  course_id: string;
  department: string;
  internship_from: string;
  internship_to: string;
  growth_area: string;
  instructor_name?: string;
}

export function useIssueCertificate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: IssueCertificateInput) => {
      const { data: course } = await supabase
        .from('courses')
        .select('title, category')
        .eq('id', p.course_id)
        .maybeSingle();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user!.id)
        .maybeSingle();

      const studentName = profile?.display_name
        || user!.email!.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      // Check if a stub already exists (created by the RPC after course completion)
      const { data: existing } = await supabase
        .from('course_certificates')
        .select('id')
        .eq('course_id', p.course_id)
        .eq('user_id', user!.id)
        .maybeSingle();

      let data, error;

      if (existing) {
        // Update the existing stub with the user-supplied details
        ({ data, error } = await supabase
          .from('course_certificates')
          .update({
            department: p.department,
            internship_from: p.internship_from,
            internship_to: p.internship_to,
            growth_area: p.growth_area,
            instructor_name: p.instructor_name ?? 'Rakshith',
            student_name: studentName,
            course_title: course?.title ?? '',
            course_category: course?.category ?? '',
          })
          .eq('course_id', p.course_id)
          .eq('user_id', user!.id)
          .select()
          .single());
      } else {
        // No stub yet — fresh insert
        ({ data, error } = await supabase
          .from('course_certificates')
          .insert({
            course_id: p.course_id,
            user_id: user!.id,
            department: p.department,
            internship_from: p.internship_from,
            internship_to: p.internship_to,
            growth_area: p.growth_area,
            instructor_name: p.instructor_name ?? 'Rakshith',
            student_name: studentName,
            course_title: course?.title ?? '',
            course_category: course?.category ?? '',
          })
          .select()
          .single());
      }

      if (error) throw error;
      return data as CourseCertificate;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-certificate', vars.course_id, user?.id] });
      qc.invalidateQueries({ queryKey: ['all-my-certificates', user?.id] });
      qc.invalidateQueries({ queryKey: ['all-certificates', user?.id] });
    },
  });
}

export function useCertificateBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['certificate-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('course_certificates')
        .select(
          'id, user_id, course_id, certificate_number, issued_at, ' +
          'department, internship_from, internship_to, growth_area, ' +
          'instructor_name, student_name, course_title, course_category, ' +
          'serial_number, share_slug, share_view_count'
        )
        .eq('share_slug', slug)
        .maybeSingle();

      if (error) {
        console.error('[cert-by-slug] supabase error', {
          slug,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      if (!data) {
        console.warn('[cert-by-slug] no row returned for slug', slug);
        return null;
      }

      // Fire-and-forget view counter — never block render on this
      supabase
        .rpc('increment_certificate_view', { slug })
        .then(({ error: rpcErr }) => {
          if (rpcErr) console.warn('[cert-by-slug] view increment failed', rpcErr.message);
        });

      return data as CourseCertificate;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

const TEMPLATE_PATH = 'templates/certificates/mdn-internship-template.jpg';

export function useCertificateTemplateUrl() {
  return useQuery({
    queryKey: ['certificate-template-url'],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from('prompt-media')
        .createSignedUrl(TEMPLATE_PATH, 60 * 60 * 24);
      return data?.signedUrl ?? '';
    },
    staleTime: 60 * 60 * 1000,
  });
}

// ── Course Shares ─────────────────────────────────────────────────────────────

export interface CourseShare {
  id: string;
  course_id: string;
  user_id: string;
  share_name: string;
  access_type: 'public' | 'password';
  password_hash: string | null;
  expires_at: string | null;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

export function useCourseShares(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-shares', courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_shares')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CourseShare[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateCourseShare() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      course_id: string;
      share_name: string;
      access_type: 'public' | 'password';
      password_hash?: string | null;
      expires_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('course_shares')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as CourseShare;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-shares', data.course_id] }),
  });
}

export function useDeleteCourseShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('course_shares').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => qc.invalidateQueries({ queryKey: ['course-shares', courseId] }),
  });
}

export function useToggleCourseShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, is_active }: { id: string; courseId: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('course_shares')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as CourseShare), courseId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['course-shares', data.course_id] }),
  });
}

// ── Lesson Comments ───────────────────────────────────────────────────────────

export interface LessonComment {
  id: string;
  lesson_id: string;
  course_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  // joined
  user_email?: string;
  user_display_name?: string;
  user_avatar_url?: string;
}

export function useLessonComments(lessonId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('*, user_profiles!lesson_comments_user_id_fkey(display_name, avatar_url)')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        user_display_name: c.user_profiles?.display_name ?? null,
        user_avatar_url: c.user_profiles?.avatar_url ?? null,
        user_profiles: undefined,
      })) as LessonComment[];
    },
    enabled: !!user && !!lessonId,
    staleTime: 2 * 60_000,
  });
}

export function useCreateLessonComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lesson_id: string;
      course_id: string;
      content: string;
      rating?: number | null;
      parent_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('lesson_comments')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as LessonComment;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['lesson-comments', data.lesson_id] }),
  });
}

export function useDeleteLessonComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lessonId }: { id: string; lessonId: string }) => {
      const { error } = await supabase.from('lesson_comments').delete().eq('id', id);
      if (error) throw error;
      return lessonId;
    },
    onSuccess: (lessonId) => qc.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
  });
}

// ─── Course Q&A ──────────────────────────────────────────────────────────────

export interface CourseQuestion {
  id: string;
  course_id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  body: string;
  is_resolved: boolean;
  upvote_count: number;
  answer_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
  user_has_voted?: boolean;
}

export interface CourseAnswer {
  id: string;
  question_id: string;
  course_id: string;
  user_id: string;
  body: string;
  is_instructor: boolean;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
  user_has_voted?: boolean;
}

export function useCourseQuestions(
  courseId: string,
  opts: { sort?: 'recent' | 'unanswered' | 'top'; search?: string } = {},
) {
  const { user } = useAuth();
  const { sort = 'recent', search = '' } = opts;
  return useQuery({
    queryKey: ['course-questions', courseId, sort, search],
    queryFn: async () => {
      let q = supabase
        .from('course_questions')
        .select('*, user_profiles!course_questions_user_id_fkey(display_name, avatar_path)')
        .eq('course_id', courseId);

      if (sort === 'unanswered') q = q.eq('answer_count', 0);
      if (sort === 'top')        q = q.order('upvote_count', { ascending: false });
      else                       q = q.order('created_at',   { ascending: false });

      if (search.trim()) {
        const safe = escapePostgrestLike(search);
        if (safe.length > 0) {
          q = (q as any).or(`title.ilike.%25${safe}%25,body.ilike.%25${safe}%25`);
        }
      }

      const { data, error } = await q;
      if (error) throw error;

      const ids = (data ?? []).map((row: any) => row.id);
      let voteSet = new Set<string>();
      if (user && ids.length) {
        const { data: votes } = await supabase
          .from('course_votes')
          .select('target_id')
          .eq('user_id', user.id)
          .eq('target_type', 'question')
          .in('target_id', ids);
        voteSet = new Set((votes ?? []).map((v: any) => v.target_id));
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        author_name: row.user_profiles?.display_name ?? 'Student',
        author_avatar: row.user_profiles?.avatar_path ?? null,
        user_has_voted: voteSet.has(row.id),
      })) as CourseQuestion[];
    },
    enabled: !!courseId,
    staleTime: 3 * 60_000,
  });
}

export function useCourseAnswers(questionId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['course-answers', questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_answers')
        .select('*, user_profiles!course_answers_user_id_fkey(display_name, avatar_path)')
        .eq('question_id', questionId)
        .order('is_instructor', { ascending: false })
        .order('upvote_count',  { ascending: false })
        .order('created_at',    { ascending: true });
      if (error) throw error;

      const ids = (data ?? []).map((row: any) => row.id);
      let voteSet = new Set<string>();
      if (user && ids.length) {
        const { data: votes } = await supabase
          .from('course_votes')
          .select('target_id')
          .eq('user_id', user.id)
          .eq('target_type', 'answer')
          .in('target_id', ids);
        voteSet = new Set((votes ?? []).map((v: any) => v.target_id));
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        author_name: row.user_profiles?.display_name ?? 'Student',
        author_avatar: row.user_profiles?.avatar_path ?? null,
        user_has_voted: voteSet.has(row.id),
      })) as CourseAnswer[];
    },
    enabled: !!questionId,
    staleTime: 3 * 60_000,
  });
}

export function useAskQuestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { course_id: string; lesson_id?: string | null; title: string; body: string }) => {
      const { data, error } = await supabase
        .from('course_questions')
        .insert({ course_id: p.course_id, user_id: user!.id, lesson_id: p.lesson_id ?? null, title: p.title.trim(), body: p.body.trim() })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['course-questions', vars.course_id] }),
  });
}

export function usePostAnswer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { question_id: string; course_id: string; body: string }) => {
      const { data, error } = await supabase
        .from('course_answers')
        .insert({ question_id: p.question_id, course_id: p.course_id, user_id: user!.id, body: p.body.trim() })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['course-answers', vars.question_id] });
      qc.invalidateQueries({ queryKey: ['course-questions', vars.course_id] });
    },
  });
}

export function useToggleVote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { target_type: 'question' | 'answer'; target_id: string; voted: boolean }) => {
      if (p.voted) {
        const { error } = await supabase.from('course_votes').delete()
          .eq('user_id', user!.id).eq('target_type', p.target_type).eq('target_id', p.target_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('course_votes')
          .insert({ user_id: user!.id, target_type: p.target_type, target_id: p.target_id });
        if (error && error.code !== '23505') throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-questions'] });
      qc.invalidateQueries({ queryKey: ['course-answers'] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; course_id: string }) => {
      const { error } = await supabase.from('course_questions').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['course-questions', vars.course_id] }),
  });
}

export function useDeleteAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; question_id: string; course_id: string }) => {
      const { error } = await supabase.from('course_answers').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['course-answers', vars.question_id] });
      qc.invalidateQueries({ queryKey: ['course-questions', vars.course_id] });
    },
  });
}

export function useToggleResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; course_id: string; is_resolved: boolean }) => {
      const { error } = await supabase.from('course_questions').update({ is_resolved: p.is_resolved }).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['course-questions', vars.course_id] }),
  });
}

// ─── Course Reviews ──────────────────────────────────────────────────────────

export interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  instructor_response: string | null;
  instructor_responded_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

export function useCourseReviews(courseId: string) {
  return useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_reviews')
        .select('*, user_profiles!course_reviews_user_id_fkey(display_name, avatar_path)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        author_name: row.user_profiles?.display_name ?? 'Student',
        author_avatar: row.user_profiles?.avatar_path ?? null,
      })) as CourseReview[];
    },
    enabled: !!courseId,
  });
}

export function useMyReview(courseId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-review', courseId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('course_reviews')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      return (data as CourseReview) ?? null;
    },
    enabled: !!user && !!courseId,
  });
}

export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { course_id: string; rating: number; title?: string; body?: string }) => {
      const { data, error } = await supabase
        .from('course_reviews')
        .insert({ course_id: p.course_id, user_id: user!.id, rating: p.rating, title: p.title?.trim() || null, body: p.body?.trim() || null })
        .select().single();

      if (error) {
        if (error.code === '23505') {
          const { data: updated, error: updErr } = await supabase
            .from('course_reviews')
            .update({ rating: p.rating, title: p.title?.trim() || null, body: p.body?.trim() || null })
            .eq('course_id', p.course_id).eq('user_id', user!.id)
            .select().single();
          if (updErr) throw updErr;
          return updated;
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['course-reviews', vars.course_id] });
      qc.invalidateQueries({ queryKey: ['my-review', vars.course_id] });
      qc.invalidateQueries({ queryKey: ['course', vars.course_id] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['explore-courses'] });
    },
  });
}

export function useDeleteMyReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('course_reviews').delete()
        .eq('course_id', courseId).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: (_, courseId) => {
      qc.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      qc.invalidateQueries({ queryKey: ['my-review', courseId] });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useInstructorRespond() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { review_id: string; course_id: string; response: string }) => {
      const { error } = await supabase.from('course_reviews')
        .update({ instructor_response: p.response.trim(), instructor_responded_at: new Date().toISOString() })
        .eq('id', p.review_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['course-reviews', vars.course_id] }),
  });
}
