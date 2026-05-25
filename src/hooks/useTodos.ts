import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Todo } from '../lib/database.types';

export function useTodos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['todos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

export function useCreateTodo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      notes?: string | null;
      due_at?: string | null;
      priority?: 'low' | 'medium' | 'high';
    }) => {
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Todo> & { id: string }) => {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('todos')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
}
