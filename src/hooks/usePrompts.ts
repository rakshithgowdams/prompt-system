import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Prompt, MediaFile } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

export function usePrompts(projectId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`prompts:user:${user.id}:${projectId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prompts', filter: `user_id=eq.${user.id}` },
        () => { qc.invalidateQueries({ queryKey: ['prompts', projectId, user.id] }); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, projectId, qc]);

  return useQuery({
    queryKey: ['prompts', projectId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Prompt[];
    },
    enabled: !!user,
  });
}

export function usePrompt(id: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !id) return;

    const channel = supabase
      .channel(`prompt:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prompts', filter: `id=eq.${id}` },
        (payload) => {
          qc.setQueryData(['prompt', id], payload.new as Prompt);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, id, qc]);

  return useQuery({
    queryKey: ['prompt', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Prompt | null;
    },
    enabled: !!user && !!id,
  });
}

export function usePromptMedia(promptId: string) {
  return useQuery({
    queryKey: ['media', promptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as MediaFile[];
    },
    enabled: !!promptId,
  });
}

interface PromptInput {
  project_id: string;
  title: string;
  prompt_text: string;
  platform: string;
  notes?: string | null;
  tags?: string[];
  status?: Prompt['status'];
  is_published?: boolean;
}

export function usePublishedPrompts() {
  return useQuery({
    queryKey: ['prompts', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Prompt[];
    },
  });
}

export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { data, error } = await supabase
        .from('prompts')
        .update({ is_published })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Prompt;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prompt', data.id] });
      qc.invalidateQueries({ queryKey: ['prompts'] });
      qc.invalidateQueries({ queryKey: ['prompts', 'published'] });
    },
  });
}

export function useCreatePrompt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PromptInput) => {
      const { data, error } = await supabase
        .from('prompts')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Prompt;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      qc.invalidateQueries({ queryKey: ['prompt', data.id] });
    },
  });
}

export function useUpdatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PromptInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('prompts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Prompt;
    },
    onMutate: async ({ id, ...input }) => {
      await qc.cancelQueries({ queryKey: ['prompt', id] });
      const prev = qc.getQueryData<Prompt>(['prompt', id]);
      qc.setQueryData(['prompt', id], (old: Prompt | undefined) => old ? { ...old, ...input } : old);
      return { prev };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['prompt', id], ctx.prev);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      qc.invalidateQueries({ queryKey: ['prompt', data.id] });
    },
  });
}

export function useDeletePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

export function useAddMediaFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      prompt_id: string;
      file_path: string;
      file_type: 'image' | 'video' | 'document' | 'audio' | 'other';
      file_name: string;
      file_size?: number;
      mime_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('media_files')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as MediaFile;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['media', data.prompt_id] }),
  });
}

export function useDeleteMediaFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, promptId, filePath }: { id: string; promptId: string; filePath: string }) => {
      await supabase.storage.from('prompt-media').remove([filePath]);
      const { error } = await supabase.from('media_files').delete().eq('id', id);
      if (error) throw error;
      return { promptId };
    },
    onSuccess: ({ promptId }) => qc.invalidateQueries({ queryKey: ['media', promptId] }),
  });
}
