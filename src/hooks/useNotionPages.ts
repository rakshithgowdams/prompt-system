import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NotionPage } from '../lib/database.types';

export function useNotionPages(projectId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId || !user) return;

    const channel = supabase
      .channel(`notion_pages:project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notion_pages', filter: `project_id=eq.${projectId}` },
        () => { qc.invalidateQueries({ queryKey: ['notion_pages', projectId] }); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, user, qc]);

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
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!pageId || !user) return;

    const channel = supabase
      .channel(`notion_page:${pageId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notion_pages', filter: `id=eq.${pageId}` },
        (payload) => {
          // Only update cache from remote if we're not the author of the change
          // (prevents overwriting in-progress edits from the same tab)
          qc.setQueryData(['notion_page', pageId], (old: NotionPage | undefined) => {
            if (!old) return payload.new as NotionPage;
            // If the server version is newer by more than 2s, accept it (another device/tab changed it)
            const serverTs = new Date(payload.new.updated_at as string).getTime();
            const localTs  = new Date(old.updated_at as string).getTime();
            if (serverTs - localTs > 2000) return payload.new as NotionPage;
            return old;
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pageId, user, qc]);

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
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ['notion_page', id] });
      const prev = qc.getQueryData<NotionPage>(['notion_page', id]);
      qc.setQueryData(['notion_page', id], (old: NotionPage | undefined) =>
        old ? { ...old, ...patch } : old,
      );
      return { prev };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notion_page', id], ctx.prev);
    },
    onSuccess: (page) => {
      qc.setQueryData(['notion_page', page.id], page);
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
