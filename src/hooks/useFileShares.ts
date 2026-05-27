import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { FileShare } from '../lib/database.types';

export function useFileShares(projectId: string) {
  return useQuery({
    queryKey: ['file_shares', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('file_shares')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FileShare[];
    },
    enabled: !!projectId,
  });
}

export function useFileShare(shareId: string) {
  return useQuery({
    queryKey: ['file_share', shareId],
    queryFn: async () => {
      if (!shareId) return null;
      const { data, error } = await supabase
        .from('file_shares')
        .select('*')
        .eq('id', shareId)
        .maybeSingle();
      if (error) throw error;
      return data as FileShare | null;
    },
    enabled: !!shareId,
    staleTime: 0,
  });
}

interface CreateShareParams {
  projectId: string;
  folderId?: string | null;
  fileId?: string | null;
  shareName: string;
  accessType: 'anyone' | 'can_edit' | 'password';
  password?: string;
  allowDownload: boolean;
  expiresAt?: string | null;
}

export function useCreateFileShare() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: CreateShareParams) => {
      // Store plaintext — the get-share edge function hashes with argon2id server-side
      const passwordHash = p.accessType === 'password' && p.password
        ? p.password
        : null;
      const { data, error } = await supabase
        .from('file_shares')
        .insert({
          user_id: user!.id,
          project_id: p.projectId,
          folder_id: p.folderId ?? null,
          file_id: p.fileId ?? null,
          share_name: p.shareName,
          password_hash: passwordHash,
          access_type: p.accessType,
          allow_download: p.allowDownload,
          expires_at: p.expiresAt ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FileShare;
    },
    onSuccess: (share) => {
      qc.invalidateQueries({ queryKey: ['file_shares', share.project_id] });
    },
  });
}

export function useUpdateFileShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FileShare> & { id: string }) => {
      const { data, error } = await supabase
        .from('file_shares')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FileShare;
    },
    onSuccess: (share) => {
      qc.invalidateQueries({ queryKey: ['file_shares', share.project_id] });
      qc.invalidateQueries({ queryKey: ['file_share', share.id] });
    },
  });
}

export function useDeleteFileShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('file_shares').delete().eq('id', id);
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['file_shares', projectId] });
    },
  });
}

export function useIncrementShareView() {
  return useMutation({
    mutationFn: async (shareId: string) => {
      await supabase.rpc('increment_share_view', { share_id: shareId }).maybeSingle();
    },
  });
}
