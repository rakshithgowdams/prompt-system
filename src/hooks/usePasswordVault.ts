import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { encryptPassword, generateSalt, buildVerifier } from '../lib/crypto';
import { useAuth } from '../contexts/AuthContext';
import type { PasswordVaultEntry } from '../lib/database.types';

const KEY = 'password_vault';

// ── Vault salt + verifier ─────────────────────────────────────────────────────

export interface VaultMeta {
  vault_salt: string | null;
  vault_verifier: string | null;
}

export function useVaultMeta() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['vault-meta', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('vault_salt, vault_verifier')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { vault_salt: null, vault_verifier: null }) as VaultMeta;
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
  });
}

export function useSetupVault() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (masterPassword: string) => {
      const salt = generateSalt();
      const verifier = await buildVerifier(masterPassword, salt);
      const { error } = await supabase
        .from('user_profiles')
        .update({ vault_salt: salt, vault_verifier: verifier })
        .eq('id', user!.id);
      if (error) throw error;
      return { salt, verifier };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vault-meta', user?.id] }),
  });
}

// ── Vault entries ─────────────────────────────────────────────────────────────

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
  masterPassword: string;
  saltB64: string;
}

export function useCreateVaultEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: SaveParams) => {
      const encrypted = await encryptPassword(p.password, p.masterPassword, p.saltB64);
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...p }: SaveParams & { id: string }) => {
      const encrypted = await encryptPassword(p.password, p.masterPassword, p.saltB64);
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
