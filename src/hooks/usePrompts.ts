import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Prompt, MediaFile } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

// ── Engagement types ──────────────────────────────────────────────────────────

export interface PromptComment {
  id: string;
  prompt_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profiles?: { display_name: string | null; avatar_path: string | null } | null;
}

export interface PromptStats {
  like_count: number;
  view_count: number;
  comment_count: number;
  user_has_liked: boolean;
}

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

export type PublishedPrompt = Prompt & { media_files: MediaFile[] };

export function usePublishedPrompts() {
  return useQuery({
    queryKey: ['prompts', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*, media_files(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PublishedPrompt[];
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

// ── Engagement: stats ─────────────────────────────────────────────────────────

export function usePromptStats(promptId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prompt-stats', promptId, user?.id],
    queryFn: async (): Promise<PromptStats> => {
      const [{ data: statsRow }, { data: likedRow }] = await Promise.all([
        supabase.rpc('get_prompt_stats', { p_prompt_id: promptId }),
        user
          ? supabase
              .from('prompt_likes')
              .select('id')
              .eq('prompt_id', promptId)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const stats = Array.isArray(statsRow) ? statsRow[0] : statsRow;
      return {
        like_count: Number(stats?.like_count ?? 0),
        view_count: Number(stats?.view_count ?? 0),
        comment_count: Number(stats?.comment_count ?? 0),
        user_has_liked: !!likedRow,
      };
    },
    enabled: !!promptId,
    staleTime: 30_000,
  });
}

// ── Engagement: record view ───────────────────────────────────────────────────

export function useRecordView() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (promptId: string) => {
      await supabase.from('prompt_views').insert({
        prompt_id: promptId,
        viewer_id: user?.id ?? null,
      });
    },
  });
}

// ── Engagement: toggle like ───────────────────────────────────────────────────

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, liked }: { promptId: string; liked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        await supabase.from('prompt_likes').delete().eq('prompt_id', promptId).eq('user_id', user.id);
      } else {
        await supabase.from('prompt_likes').insert({ prompt_id: promptId, user_id: user.id });
      }
      return { promptId, newLiked: !liked };
    },
    onMutate: async ({ promptId, liked }) => {
      await qc.cancelQueries({ queryKey: ['prompt-stats', promptId, user?.id] });
      const prev = qc.getQueryData<PromptStats>(['prompt-stats', promptId, user?.id]);
      qc.setQueryData<PromptStats>(['prompt-stats', promptId, user?.id], (old) =>
        old
          ? { ...old, user_has_liked: !liked, like_count: old.like_count + (liked ? -1 : 1) }
          : old
      );
      return { prev };
    },
    onError: (_err, { promptId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['prompt-stats', promptId, user?.id], ctx.prev);
    },
    onSuccess: ({ promptId }) => {
      qc.invalidateQueries({ queryKey: ['prompt-stats', promptId] });
    },
  });
}

// ── Engagement: comments ──────────────────────────────────────────────────────

export function usePromptComments(promptId: string) {
  return useQuery({
    queryKey: ['prompt-comments', promptId],
    queryFn: async (): Promise<PromptComment[]> => {
      const { data, error } = await supabase
        .from('prompt_comments')
        .select('*, user_profiles(display_name, avatar_path)')
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PromptComment[];
    },
    enabled: !!promptId,
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, content }: { promptId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      // Insert without join to avoid FK resolution issues, then re-fetch with profile
      const { data: inserted, error: insertErr } = await supabase
        .from('prompt_comments')
        .insert({ prompt_id: promptId, user_id: user.id, content: content.trim() })
        .select('id, prompt_id')
        .single();
      if (insertErr) throw insertErr;
      const { data, error } = await supabase
        .from('prompt_comments')
        .select('*, user_profiles(display_name, avatar_path)')
        .eq('id', inserted.id)
        .single();
      if (error) throw error;
      return data as PromptComment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prompt-comments', data.prompt_id] });
      qc.invalidateQueries({ queryKey: ['prompt-stats', data.prompt_id] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, promptId }: { id: string; promptId: string }) => {
      const { error } = await supabase.from('prompt_comments').delete().eq('id', id);
      if (error) throw error;
      return { promptId };
    },
    onSuccess: ({ promptId }) => {
      qc.invalidateQueries({ queryKey: ['prompt-comments', promptId] });
      qc.invalidateQueries({ queryKey: ['prompt-stats', promptId] });
    },
  });
}
