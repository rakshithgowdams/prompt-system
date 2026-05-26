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
    onSuccess: (todo) => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      // Fire-and-forget: "todo created" email — best-effort, never blocks UI
      supabase.functions
        .invoke('todo-created', { body: { todo_id: todo.id } })
        .catch((e) => console.warn('[todo-email] created notification failed:', e));
    },
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
          // Reset sent flag when un-completing so re-completing sends the email again
          ...(completed ? {} : { completed_email_sent_at: null }),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: (todo) => {
      qc.invalidateQueries({ queryKey: ['todos'] });
      // Fire-and-forget: "todo completed" email — only when transitioning to completed=true
      if (todo.completed) {
        supabase.functions
          .invoke('todo-completed', { body: { todo_id: todo.id } })
          .catch((e) => console.warn('[todo-email] completed notification failed:', e));
      }
    },
  });
}

export function useTodoEmailPreference() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['todo-email-pref', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('todo_emails_enabled')
        .eq('id', user!.id)
        .maybeSingle();
      return data?.todo_emails_enabled ?? true;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ todo_emails_enabled: enabled })
        .eq('id', user!.id);
      if (error) throw error;
      return enabled;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todo-email-pref'] }),
  });

  return {
    enabled: query.data ?? true,
    setEnabled: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
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
