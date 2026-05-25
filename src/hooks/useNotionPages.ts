import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NotionPage } from '../lib/database.types';

export function useNotionPages(projectId: string) {
  return useQuery({
    queryKey: ['notion_pages', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('notion_pages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as NotionPage[];
    },
    enabled: !!projectId,
  });
}

export function useNotionPage(pageId: string) {
  return useQuery({
    queryKey: ['notion_page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from('notion_pages')
        .select('*')
        .eq('id', pageId)
        .maybeSingle();
      if (error) throw error;
      return data as NotionPage | null;
    },
    enabled: !!pageId,
  });
}

export function useCreateNotionPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ projectId, title = 'Untitled', icon = '📄' }: { projectId: string; title?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('notion_pages')
        .insert({ project_id: projectId, user_id: user!.id, title, icon, content: [] })
        .select()
        .single();
      if (error) throw error;
      return data as NotionPage;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['notion_pages', page.project_id] });
    },
  });
}

export function useUpdateNotionPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<NotionPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('notion_pages')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as NotionPage;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ['notion_page', page.id] });
      qc.invalidateQueries({ queryKey: ['notion_pages', page.project_id] });
    },
  });
}

export function useDeleteNotionPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('notion_pages').delete().eq('id', id);
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['notion_pages', projectId] });
    },
  });
}
