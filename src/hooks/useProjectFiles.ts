import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  folder_id: string | null;
  user_id: string;
  file_path: string;
  file_name: string;
  file_type: 'image' | 'video' | 'audio' | 'document' | 'other';
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

// ── Folders ───────────────────────────────────────────────────────────────────

export function useFolders(projectId: string, parentFolderId: string | null = null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['folders', projectId, parentFolderId ?? 'root'],
    queryFn: async () => {
      let q = supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('name', { ascending: true });
      q = parentFolderId === null
        ? q.is('parent_folder_id', null)
        : q.eq('parent_folder_id', parentFolderId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Folder[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useAllFolders(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['folders-all', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Folder[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useCreateFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { projectId: string; name: string; parentFolderId: string | null }) => {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          project_id: p.projectId,
          user_id: user!.id,
          name: p.name.trim(),
          parent_folder_id: p.parentFolderId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Folder;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folders', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['folders-all', vars.projectId] });
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string; name: string }) => {
      const { error } = await supabase
        .from('folders')
        .update({ name: p.name.trim() })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folders', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['folders-all', vars.projectId] });
    },
  });
}

export function useMoveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string; newParentId: string | null }) => {
      if (p.newParentId === p.id) throw new Error('Cannot move a folder into itself');
      const { error } = await supabase
        .from('folders')
        .update({ parent_folder_id: p.newParentId })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folders', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['folders-all', vars.projectId] });
    },
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
      qc.invalidateQueries({ queryKey: ['folders-all', projectId] });
      qc.invalidateQueries({ queryKey: ['project-files', projectId] });
    },
  });
}

export function useDeleteFolderRecursive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string }) => {
      const { data, error } = await supabase.rpc('delete_folder_recursive', { p_folder_id: p.id });
      if (error) throw error;
      const paths = (data ?? []).map((r: any) => r.deleted_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        for (let i = 0; i < paths.length; i += 100) {
          await supabase.storage.from('prompt-media').remove(paths.slice(i, i + 100)).catch((e) => {
            console.warn('[delete-folder] storage cleanup error:', e);
          });
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folders', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['folders-all', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

// ── Project Files ─────────────────────────────────────────────────────────────

export function useProjectFiles(projectId: string, folderId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['project-files', projectId, folderId ?? 'root'],
    queryFn: async () => {
      let q = supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      q = folderId === null ? q.is('folder_id', null) : q.eq('folder_id', folderId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProjectFile[];
    },
    enabled: !!user && !!projectId,
  });
}

export function useAllProjectFiles(projectId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['project-files-all', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectFile[];
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
      file_type: ProjectFile['file_type'];
      file_size?: number | null;
      mime_type?: string | null;
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

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string; name: string }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ file_name: p.name.trim() })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

export function useMoveFileToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ folder_id: p.folderId })
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

export function useDeleteProjectFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; projectId: string; filePath: string }) => {
      await supabase.storage.from('prompt-media').remove([p.filePath]).catch((e) => {
        console.warn('[delete-file] storage remove failed:', e);
      });
      const { error } = await supabase.from('project_files').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

export function useBulkDeleteFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { projectId: string; files: { id: string; file_path: string }[] }) => {
      const paths = p.files.map((f) => f.file_path);
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from('prompt-media').remove(paths.slice(i, i + 100)).catch(() => {});
      }
      const ids = p.files.map((f) => f.id);
      const { error } = await supabase.from('project_files').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

export function useBulkMoveFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { projectId: string; fileIds: string[]; folderId: string | null }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ folder_id: p.folderId })
        .in('id', p.fileIds);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['project-files-all', vars.projectId] });
    },
  });
}

// ── Folder path (breadcrumb chain) ────────────────────────────────────────────

export function useFolderPath(projectId: string, folderId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['folder-path', projectId, folderId ?? 'root'],
    queryFn: async () => {
      if (!folderId) return [] as Folder[];
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user!.id);
      if (error) throw error;
      const byId = new Map<string, Folder>((data ?? []).map((f: any) => [f.id, f as Folder]));
      const chain: Folder[] = [];
      let cur = byId.get(folderId);
      let safety = 0;
      while (cur && safety < 20) {
        chain.unshift(cur);
        if (!cur.parent_folder_id) break;
        cur = byId.get(cur.parent_folder_id);
        safety++;
      }
      return chain;
    },
    enabled: !!user && !!projectId && !!folderId,
  });
}
