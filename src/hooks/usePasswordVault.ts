import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { encryptPassword } from '../lib/crypto';
import { useAuth } from '../contexts/AuthContext';
import type { PasswordVaultEntry } from '../lib/database.types';

const KEY = 'password_vault';

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
      return data as PasswordVaultEntry[];
    },
    enabled: !!user,
  });
}

interface SaveParams {
  platform: string;
  siteUrl: string;
  username: string;
  password: string;
  notes: string;
}

export function useCreateVaultEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: SaveParams) => {
      const encrypted = await encryptPassword(p.password, user!.id);
      const { data, error } = await supabase
        .from('password_vault')
        .insert({
          user_id: user!.id,
          platform: p.platform,
          site_url: p.siteUrl,
          username: p.username,
          encrypted_data: encrypted,
          notes: p.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PasswordVaultEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVaultEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...p }: SaveParams & { id: string }) => {
      const encrypted = await encryptPassword(p.password, user!.id);
      const { data, error } = await supabase
        .from('password_vault')
        .update({
          platform: p.platform,
          site_url: p.siteUrl,
          username: p.username,
          encrypted_data: encrypted,
          notes: p.notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PasswordVaultEntry;
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
