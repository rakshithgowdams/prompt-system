import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const KEY = 'password_vault';

export interface VaultEntry {
  id: string;
  user_id: string;
  platform: string;
  site_url: string;
  favicon_url: string;
  username: string;
  password: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function usePasswordVault() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_vault')
        .select('*')
        .eq('user_id', user!.id)
        .order('platform', { ascending: true });
      if (error) throw error;
      return data as VaultEntry[];
    },
    enabled: !!user,
  });
}

export interface SaveParams {
  platform: string;
  siteUrl: string;
  faviconUrl: string;
  username: string;
  password: string;
  notes: string;
}

export function useCreateVaultEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: SaveParams) => {
      const { data, error } = await supabase
        .from('password_vault')
        .insert({
          user_id: user!.id,
          platform: p.platform,
          site_url: p.siteUrl,
          favicon_url: p.faviconUrl,
          username: p.username,
          encrypted_data: p.password,
          notes: p.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data as VaultEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...p }: SaveParams & { id: string }) => {
      const { data, error } = await supabase
        .from('password_vault')
        .update({
          platform: p.platform,
          site_url: p.siteUrl,
          favicon_url: p.faviconUrl,
          username: p.username,
          encrypted_data: p.password,
          notes: p.notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as VaultEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('password_vault').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
