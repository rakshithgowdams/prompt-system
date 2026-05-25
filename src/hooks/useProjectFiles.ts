import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Folder, ProjectFile, FileType } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

// ── Folders ──────────────────────────────────────────────────────────────────

export function useFolders(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['folders', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Folder[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useCreateFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
      const { data, error } = await supabase
        .from('folders')
        .insert({ project_id: projectId, user_id: user!.id, name })
        .select()
        .single();
      if (error) throw error;
      return data as Folder;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['folders', vars.projectId] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['folders', projectId] });
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });
}

// ── Project Files ─────────────────────────────────────────────────────────────

export function useProjectFiles(projectId: string, folderId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['project-files', projectId, folderId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectFile[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useAllProjectFiles(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['project-files-all', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProjectFile[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useAddProjectFile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      folder_id?: string | null;
      file_path: string;
      file_name: string;
      file_type: FileType;
      file_size?: number;
      mime_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_files')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectFile;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['project-files', data.project_id] });
      qc.invalidateQueries({ queryKey: ['project-files-all', data.project_id] });
    },
  });
}

export function useDeleteProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      filePath,
    }: {
      id: string;
      projectId: string;
      filePath: string;
    }) => {
      await supabase.storage.from('prompt-media').remove([filePath]);
      const { error } = await supabase.from('project_files').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', projectId] });
    },
  });
}

export function useMoveFileToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileId,
      projectId,
      folderId,
    }: {
      fileId: string;
      projectId: string;
      folderId: string | null;
    }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ folder_id: folderId })
        .eq('id', fileId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', projectId] });
    },
  });
}
