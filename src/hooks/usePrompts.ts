import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Prompt, MediaFile } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

export function usePrompts(projectId?: string) {
  const { user } = useAuth();
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
