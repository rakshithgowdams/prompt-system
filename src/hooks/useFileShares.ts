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
  accessType: 'anyone' | 'password';
  password?: string;
  allowDownload: boolean;
  expiresAt?: string | null;
}

// Simple password hash — NOT cryptographic, just obfuscation stored in DB.
// A real app would use bcrypt via an Edge Function. We use a simple SHA-256-like
// approach via SubtleCrypto so no extra package is needed.
async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySharePassword(hash: string, attempt: string): Promise<boolean> {
  const attemptHash = await hashPassword(attempt);
  return hash === attemptHash;
}

export function useCreateFileShare() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: CreateShareParams) => {
      const passwordHash = p.accessType === 'password' && p.password
        ? await hashPassword(p.password)
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
