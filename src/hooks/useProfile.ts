import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  bio: string;
  headline: string;
  location: string;
  website_url: string;
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  instagram_url: string;
  college: string;
  school: string;
  college_year: string;
  school_year: string;
  degree: string;
  experience_years: number;
  experience_title: string;
  experience_company: string;
  skills: string[];
  is_portfolio_public: boolean;
  portfolio_slug: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpsertInput = Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!user,
  });
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!userId,
  });
}

export function useUpsertProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileUpsertInput) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ id: user!.id, ...input, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });
}

export function getAvatarUrl(avatarPath: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
  return data.publicUrl;
}

// Fetch a public profile by portfolio_slug (no auth required)
export function usePublicProfileBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-portfolio', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('portfolio_slug', slug!)
        .eq('is_portfolio_public', true)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!slug,
  });
}

// Fetch all certificates for a public portfolio owner
export function usePublicPortfolioCertificates(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-portfolio-certs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_certificates')
        .select('*, courses(title, cover_image, description)')
        .eq('user_id', userId!)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string;
        course_id: string;
        serial_number: string;
        student_name: string;
        course_title: string;
        course_category: string;
        department: string;
        growth_area: string;
        internship_from: string;
        internship_to: string;
        issued_at: string;
        share_slug: string | null;
        instructor_name: string | null;
        courses: { title: string; cover_image: string | null; description: string | null } | null;
      }>;
    },
    enabled: !!userId,
  });
}

// Generate (or return existing) portfolio slug and flip is_portfolio_public = true
export function useGeneratePortfolioSlug() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_portfolio_slug', { p_user_id: user!.id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });
}

// All certificates earned by current user (across all courses)
export function useAllMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-certificates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_certificates')
        .select('*, courses(title, cover_image, description)')
        .eq('user_id', user!.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string;
        course_id: string;
        serial_number: string;
        student_name: string;
        course_title: string;
        course_category: string;
        department: string;
        growth_area: string;
        internship_from: string;
        internship_to: string;
        issued_at: string;
        share_slug: string | null;
        instructor_name: string | null;
        courses: { title: string; cover_image: string | null; description: string | null } | null;
      }>;
    },
    enabled: !!user,
  });
}
