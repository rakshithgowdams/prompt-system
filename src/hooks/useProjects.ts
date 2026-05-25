import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PROJECTS = [
  { name: 'aiwithrakshith', slug: 'aiwithrakshith', icon: '🎯', color: 'blue', is_default: true },
  { name: 'aiwithpanchami', slug: 'aiwithpanchami', icon: '✨', color: 'purple', is_default: true },
];

async function ensureDefaultProjects(userId: string): Promise<Project[]> {
  const { data: existing, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // If defaults are missing (trigger may have failed), create them now
  const existingSlugs = (existing ?? []).map((p) => p.slug);
  const missing = DEFAULT_PROJECTS.filter((d) => !existingSlugs.includes(d.slug));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from('projects').insert(
      missing.map((p) => ({ ...p, user_id: userId })),
    );
    if (insertError) throw insertError;

    const { data: updated, error: refetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (refetchError) throw refetchError;
    return updated as Project[];
  }

  return existing as Project[];
}

export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => ensureDefaultProjects(user!.id),
    enabled: !!user,
  });
}

export function useProject(slug: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['project', slug, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!user && !!slug,
  });
}

export function useCreateProject() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; icon?: string; color?: string; cover_image?: string | null }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; cover_image?: string | null; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
