import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!user,
  });
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      return data as UserProfile | null;
    },
    enabled: !!userId,
  });
}

export function useUpsertProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { display_name: string; avatar_path?: string | null }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ id: user!.id, ...input, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });
}

export function getAvatarUrl(avatarPath: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
  return data.publicUrl;
}
