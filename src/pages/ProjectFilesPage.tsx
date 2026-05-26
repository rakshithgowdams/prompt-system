import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useProject } from '../hooks/useProjects';
import {
  useFolders,
  useProjectFiles,
  useCreateFolder,
  useDeleteFolderRecursive,
  useAddProjectFile,
  useDeleteProjectFile,
  useRenameFile,
  useRenameFolder,
  useMoveFileToFolder,
  useBulkDeleteFiles,
  useFolderPath,
  type Folder,
  type ProjectFile,
} from '../hooks/useProjectFiles';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { FileGridSkeleton, ListRowSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { FileShareModal } from '../components/files/FileShareModal';
import { FileTypeIcon } from '../components/files/FileTypeIcon';
import { FilePreview } from '../components/files/FilePreview';
import { MoveToModal } from '../components/files/MoveToModal';
import { Lightbox } from '../components/prompts/Lightbox';
import { uploadProjectFile, getSignedUrl, downloadFile } from '../lib/storage';
import { detectFileType, formatFileSize } from '../lib/fileTypes';
import { extractEntries, extractFromInput, splitPath, type UploadEntry } from '../lib/folderUpload';
import { cn, PROJECT_COLORS, formatRelative } from '../lib/utils';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'image' | 'video' | 'audio' | 'document' | 'other' | '';

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ projectName, path, onNavigate }: {
  projectName: string;
  path: Folder[];
  onNavigate: (folderId: string | null) => void;
}) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-0.5 scrollbar-none flex-nowrap">
      <button
        onClick={() => onNavigate(null)}
        className="font-semibold text-white hover:text-white/80 transition-colors whitespace-nowrap flex-shrink-0"
      >
        {projectName}
      </button>
      {path.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1 flex-shrink-0">
          <Icon name="chevron_right" size={14} className="text-white/40" />
          {i === path.length - 1 ? (
            <span className="font-semibold text-white whitespace-nowrap">{folder.name}</span>
          ) : (
            <button
              onClick={() => onNavigate(folder.id)}
              className="text-white/70 hover:text-white transition-colors whitespace-nowrap"
            >
              {folder.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProjectFilesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const { data: project, isLoading: projectLoading } = useProject(slug ?? '');

  const folderParam = searchParams.get('folder');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(folderParam);

  const setFolder = useCallback((id: string | null) => {
    setActiveFolderId(id);
    setSelectedIds(new Set());
    if (id) setSearchParams({ folder: id }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    setActiveFolderId(searchParams.get('folder'));
  }, [searchParams]);

  // Data
  const { data: folders = [], isLoading: foldersLoading } = useFolders(project?.id ?? '', activeFolderId);
  const { data: files = [], isLoading: filesLoading } = useProjectFiles(project?.id ?? '', activeFolderId);
  const { data: folderPath = [] } = useFolderPath(project?.id ?? '', activeFolderId);

  // Mutations
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolderRecursive();
  const addFile = useAddProjectFile();
  const deleteFile = useDeleteProjectFile();
  const renameFile = useRenameFile();
  const renameFolder = useRenameFolder();
  const bulkDelete = useBulkDeleteFiles();

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; item: ProjectFile | Folder } | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [lightboxImages, setLightboxImages] = useState<(ProjectFile & { signedUrl: string })[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<(ProjectFile & { signedUrl: string }) | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: 'project' | 'file' | 'folder'; file?: ProjectFile; folder?: Folder } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ targets: { type: 'file' | 'folder'; id: string }[]; forbiddenIds: string[] } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; item: ProjectFile | Folder } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Filtered view
  const visibleFolders = folders.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );
  const visibleFiles = files.filter((f) => {
    const matchSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || f.file_type === filterType;
    return matchSearch && matchType;
  });
  const totalItems = visibleFolders.length + visibleFiles.length;

  // ── Upload helpers ─────────────────────────────────────────────────────────

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const processSingleFileUpload = useCallback(async (
    file: File,
    targetFolderId: string | null,
    displayName?: string,
  ) => {
    if (!project || !user) return;
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const name = displayName || file.name;
    setUploads((prev) => [...prev, { id: uid, name, size: file.size, progress: 0, status: 'uploading' }]);
    try {
      updateUpload(uid, { progress: 30 });
      const path = await uploadProjectFile(user.id, project.id, file);
      updateUpload(uid, { progress: 75 });
      const info = detectFileType(file.name, file.type);
      await addFile.mutateAsync({
        project_id: project.id,
        folder_id: targetFolderId,
        file_path: path,
        file_name: name,
        file_type: info.dbType,
        file_size: file.size,
        mime_type: file.type,
      });
      updateUpload(uid, { progress: 100, status: 'done' });
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uid)), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateUpload(uid, { status: 'error', error: msg });
    }
  }, [project, user, addFile, updateUpload]);

  const uploadBatch = useCallback(async (entries: UploadEntry[]) => {
    if (!project || !user) return;

    const folderCache = new Map<string, string | null>();
    folderCache.set('', activeFolderId);

    async function ensureFolder(parts: string[]): Promise<string | null> {
      const key = parts.join('/');
      if (folderCache.has(key)) return folderCache.get(key)!;
      if (parts.length === 0) return activeFolderId;

      const parent = await ensureFolder(parts.slice(0, -1));
      const name = parts[parts.length - 1];

      try {
        const created = await createFolder.mutateAsync({
          projectId: project!.id,
          name,
          parentFolderId: parent,
        });
        folderCache.set(key, created.id);
        return created.id;
      } catch (e: any) {
        if (e?.code === '23505' || /duplicate/i.test(e?.message ?? '')) {
          const { data } = await supabase
            .from('folders')
            .select('id, name, parent_folder_id')
            .eq('project_id', project!.id)
            .eq('user_id', user!.id);
          const existing = (data ?? []).find(
            (f: any) => f.name.toLowerCase() === name.toLowerCase() && f.parent_folder_id === parent
          );
          const id = existing?.id ?? null;
          folderCache.set(key, id);
          return id;
        }
        throw e;
      }
    }

    for (const entry of entries) {
      const { folders: folderParts, fileName } = splitPath(entry.relativePath);
      if (!fileName) continue;
      try {
        const targetFolderId = await ensureFolder(folderParts);
        await processSingleFileUpload(entry.file, targetFolderId, fileName);
      } catch (e) {
        console.error('[folder-upload] failed for', entry.relativePath, e);
      }
    }
  }, [project, user, activeFolderId, createFolder, processSingleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const entries = extractFromInput(e.target.files);
    uploadBatch(entries);
    e.target.value = '';
  }, [uploadBatch]);

  const handleFolderInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const entries = extractFromInput(e.target.files);
    uploadBatch(entries);
    e.target.value = '';
  }, [uploadBatch]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragging(false);
    try {
      const entries = await extractEntries(e.dataTransfer);
      if (entries.length > 0) uploadBatch(entries);
    } catch {
      toast.error('Drop failed');
    }
  }, [uploadBatch]);

  // ── Create folder ──────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!project || !newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync({
        projectId: project.id,
        name: newFolderName.trim(),
        parentFolderId: activeFolderId,
      });
      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create folder');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget || !project) return;
    try {
      if (deleteTarget.type === 'file') {
        const f = deleteTarget.item as ProjectFile;
        await deleteFile.mutateAsync({ id: f.id, projectId: project.id, filePath: f.file_path });
        toast.success('File deleted');
      } else {
        const f = deleteTarget.item as Folder;
        await deleteFolder.mutateAsync({ id: f.id, projectId: project.id });
        toast.success('Folder and all contents deleted');
      }
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!project || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected items? This cannot be undone.`)) return;
    const selectedFiles = visibleFiles.filter((f) => selectedIds.has(f.id));
    try {
      await bulkDelete.mutateAsync({ projectId: project.id, files: selectedFiles.map((f) => ({ id: f.id, file_path: f.file_path })) });
      toast.success(`Deleted ${selectedFiles.length} files`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  // ── Rename ─────────────────────────────────────────────────────────────────

  const openRename = (type: 'file' | 'folder', item: ProjectFile | Folder) => {
    setRenameTarget({ type, item });
    setRenameName(type === 'file' ? (item as ProjectFile).file_name : (item as Folder).name);
  };

  const handleRename = async () => {
    if (!renameTarget || !project || !renameName.trim()) return;
    try {
      if (renameTarget.type === 'file') {
        await renameFile.mutateAsync({ id: renameTarget.item.id, projectId: project.id, name: renameName });
      } else {
        await renameFolder.mutateAsync({ id: renameTarget.item.id, projectId: project.id, name: renameName });
      }
      toast.success('Renamed');
      setRenameTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Rename failed');
    }
  };

  // ── Move ───────────────────────────────────────────────────────────────────

  const openMoveFile = (file: ProjectFile) => setMoveTarget({
    targets: [{ type: 'file', id: file.id }],
    forbiddenIds: [],
  });

  const openMoveFolder = (folder: Folder) => setMoveTarget({
    targets: [{ type: 'folder', id: folder.id }],
    forbiddenIds: [folder.id],
  });

  const openBulkMove = () => {
    const selectedFiles = visibleFiles.filter((f) => selectedIds.has(f.id));
    setMoveTarget({
      targets: selectedFiles.map((f) => ({ type: 'file' as const, id: f.id })),
      forbiddenIds: [],
    });
  };

  // ── Preview ────────────────────────────────────────────────────────────────

  const openPreview = async (file: ProjectFile) => {
    try {
      const signedUrl = await getSignedUrl(file.file_path, 3600);
      const info = detectFileType(file.file_name, file.mime_type);
      if (info.category === 'image') {
        const imageFiles = visibleFiles.filter((f) => detectFileType(f.file_name, f.mime_type).category === 'image');
        const withUrls = await Promise.all(
          imageFiles.map(async (f) => ({
            ...f,
            signedUrl: f.id === file.id ? signedUrl : await getSignedUrl(f.file_path, 3600).catch(() => ''),
          }))
        );
        const idx = withUrls.findIndex((f) => f.id === file.id);
        setLightboxImages(withUrls.filter((f) => f.signedUrl));
        setLightboxIndex(idx >= 0 ? idx : 0);
      } else {
        setPreviewFile({ ...file, signedUrl });
      }
    } catch {
      toast.error('Could not open preview');
    }
  };

  const handleDownload = async (file: ProjectFile | (ProjectFile & { signedUrl: string })) => {
    try {
      await downloadFile(file.file_path, file.file_name);
    } catch {
      toast.error('Download failed');
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(visibleFiles.map((f) => f.id)));
  };

  if (projectLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <div className="h-40 rounded-xl bg-ink-100 animate-pulse" />
        <FileGridSkeleton count={12} />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-ink-500">Project not found.</div>;

  return (
    <div
      className="flex flex-col h-full min-h-screen bg-white"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* ── Header ── */}
      <div className={cn(
        'px-4 lg:px-8 py-5 bg-gradient-to-r text-white relative overflow-hidden',
        PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
      )}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex flex-col gap-3">
          {/* Breadcrumb navigation */}
          <Breadcrumb
            projectName={project.name}
            path={folderPath}
            onNavigate={setFolder}
          />

          {/* Title + actions row */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => activeFolderId ? setFolder(activeFolderId ? (folderPath[folderPath.length - 2]?.id ?? null) : null) : navigate(`/projects/${slug}`)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <Icon name="arrow_back" size={18} className="text-white" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">
                  {folderPath.length > 0 ? folderPath[folderPath.length - 1].name : `${project.name} — Files`}
                </h1>
                <p className="text-xs text-white/60">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={viewMode === 'grid' ? 'List view' : 'Grid view'}
              >
                <Icon name={viewMode === 'grid' ? 'view_list' : 'grid_view'} size={18} />
              </button>
              <button
                onClick={() => setShareTarget({ type: 'project' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
              >
                <Icon name="share" size={16} />
                <span className="hidden sm:inline">Share</span>
              </button>

              {/* "+ New" dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNewMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-ink-900 text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg"
                >
                  <Icon name="add" size={16} />
                  New
                  <Icon name="expand_more" size={14} />
                </button>
                <AnimatePresence>
                  {newMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setNewMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 z-20 bg-white border border-ink-200 rounded-xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden"
                      >
                        <button
                          onClick={() => { setNewMenuOpen(false); setNewFolderOpen(true); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                        >
                          <Icon name="create_new_folder" size={16} className="text-amber-500" />
                          New folder
                        </button>
                        <button
                          onClick={() => { setNewMenuOpen(false); fileInputRef.current?.click(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                        >
                          <Icon name="upload_file" size={16} className="text-blue-500" />
                          Upload files
                        </button>
                        <button
                          onClick={() => { setNewMenuOpen(false); folderInputRef.current?.click(); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                        >
                          <Icon name="drive_folder_upload" size={16} className="text-emerald-500" />
                          Upload folder
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1 sm:max-w-sm">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files and folders..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-colors"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none"
            >
              <option value="">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="document">Documents</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Upload progress strip ── */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-ink-200 overflow-hidden"
          >
            <div className="px-4 lg:px-8 py-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {uploads.map((u) => (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors',
                      u.status === 'error' ? 'bg-red-50 border-red-200'
                      : u.status === 'done' ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-ink-50 border-ink-200',
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      u.status === 'error' ? 'bg-red-100 text-red-500'
                      : u.status === 'done' ? 'bg-emerald-100 text-emerald-500'
                      : 'bg-blue-100 text-blue-500',
                    )}>
                      {u.status === 'uploading' && (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      )}
                      {u.status === 'done' && <Icon name="check_circle" size={14} fill />}
                      {u.status === 'error' && <Icon name="error" size={14} fill />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-ink-900 truncate font-medium">{u.name}</p>
                        <span className="text-xs text-ink-500 flex-shrink-0">{formatFileSize(u.size)}</span>
                      </div>
                      {u.status === 'uploading' && (
                        <div className="mt-1 h-0.5 bg-ink-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-blue-400"
                            initial={{ width: '0%' }}
                            animate={{ width: `${u.progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        </div>
                      )}
                      {u.status === 'error' && <p className="text-xs text-red-500 mt-0.5">{u.error}</p>}
                    </div>
                    {(u.status === 'error' || u.status === 'done') && (
                      <button
                        onClick={() => setUploads((p) => p.filter((x) => x.id !== u.id))}
                        className="text-ink-400 hover:text-ink-700 p-1 rounded-md hover:bg-ink-100 transition-colors"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-ink-900 text-white overflow-hidden flex-shrink-0"
          >
            <div className="px-4 lg:px-8 py-2.5 flex items-center gap-3">
              <span className="text-sm font-semibold">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={selectAll} className="text-xs text-white/70 hover:text-white transition-colors px-2 py-1">
                  Select all ({visibleFiles.length})
                </button>
                <button
                  onClick={openBulkMove}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors"
                >
                  <Icon name="drive_file_move" size={14} />
                  Move
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                >
                  <Icon name="delete" size={14} />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-page drag overlay ── */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-blue-500/10 backdrop-blur-[2px] border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center bg-white/90 rounded-3xl px-12 py-10 shadow-2xl border border-blue-200">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-4">
                <Icon name="cloud_upload" size={40} className="text-blue-500" />
              </div>
              <p className="text-blue-700 text-2xl font-extrabold">Drop to upload</p>
              <p className="text-blue-500 text-sm mt-1.5 font-medium">Files and folders — structure preserved</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content area ── */}
      <div className="flex-1 relative">
        <div className="p-4 lg:p-8">
          {foldersLoading || filesLoading ? (
            viewMode === 'grid' ? <FileGridSkeleton count={12} /> : <ListRowSkeleton count={8} />
          ) : totalItems === 0 ? (
            <EmptyState
              icon={<Icon name="folder_open" size={32} className="text-ink-400" />}
              title={activeFolderId ? 'This folder is empty' : 'No files yet'}
              description="Drop files here, or click New to upload."
              action={{ label: 'Upload files', onClick: () => fileInputRef.current?.click() }}
            />
          ) : viewMode === 'grid' ? (
            <GridView
              folders={visibleFolders}
              files={visibleFiles}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onOpenFolder={(f) => setFolder(f.id)}
              onPreviewFile={openPreview}
              onDownloadFile={handleDownload}
              onDeleteFolder={(f) => setDeleteTarget({ type: 'folder', item: f })}
              onDeleteFile={(f) => setDeleteTarget({ type: 'file', item: f })}
              onShareFolder={(f) => setShareTarget({ type: 'folder', folder: f })}
              onShareFile={(f) => setShareTarget({ type: 'file', file: f })}
              onRenameFile={(f) => openRename('file', f)}
              onRenameFolder={(f) => openRename('folder', f)}
              onMoveFile={openMoveFile}
              onMoveFolder={openMoveFolder}
            />
          ) : (
            <ListView
              folders={visibleFolders}
              files={visibleFiles}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onOpenFolder={(f) => setFolder(f.id)}
              onPreviewFile={openPreview}
              onDownloadFile={handleDownload}
              onDeleteFolder={(f) => setDeleteTarget({ type: 'folder', item: f })}
              onDeleteFile={(f) => setDeleteTarget({ type: 'file', item: f })}
              onShareFolder={(f) => setShareTarget({ type: 'folder', folder: f })}
              onShareFile={(f) => setShareTarget({ type: 'file', file: f })}
              onRenameFile={(f) => openRename('file', f)}
              onRenameFolder={(f) => openRename('folder', f)}
              onMoveFile={openMoveFile}
              onMoveFolder={openMoveFolder}
            />
          )}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <div className="lg:hidden fixed bottom-20 right-4 z-10">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
        >
          <Icon name="upload" size={24} />
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        // @ts-expect-error — webkitdirectory is not in TS types yet
        webkitdirectory=""
        multiple
        onChange={handleFolderInputChange}
      />

      {/* ── New folder modal ── */}
      <AnimatePresence>
        {newFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setNewFolderOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-sm bg-white border border-ink-200 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Icon name="create_new_folder" size={20} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-ink-900">New Folder</h2>
                  {activeFolderId && folderPath.length > 0 && (
                    <p className="text-xs text-ink-500">Inside {folderPath[folderPath.length - 1].name}</p>
                  )}
                </div>
              </div>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name"
                maxLength={100}
                className="w-full h-11 px-4 rounded-xl bg-white border border-ink-200 text-ink-900 placeholder-ink-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 mb-4 transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setNewFolderOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-ink-200 text-ink-500 hover:text-ink-900 text-sm transition-colors"
                >
                  Cancel
                </button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} loading={createFolder.isPending} className="flex-1">
                  Create
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Rename modal ── */}
      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setRenameTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-sm bg-white border border-ink-200 rounded-2xl shadow-2xl p-6"
            >
              <h2 className="text-base font-display font-bold text-ink-900 mb-4">
                Rename {renameTarget.type === 'file' ? 'File' : 'Folder'}
              </h2>
              <input
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                maxLength={200}
                className="w-full h-11 px-4 rounded-xl bg-white border border-ink-200 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 mb-4 transition-colors"
              />
              <div className="flex gap-3">
                <button onClick={() => setRenameTarget(null)} className="flex-1 h-10 rounded-xl border border-ink-200 text-ink-500 text-sm transition-colors hover:text-ink-900">
                  Cancel
                </button>
                <Button
                  onClick={handleRename}
                  disabled={!renameName.trim()}
                  loading={renameFile.isPending || renameFolder.isPending}
                  className="flex-1"
                >
                  Rename
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FilePreview ── */}
      <FilePreview
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* ── Lightbox for images ── */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setLightboxImages([]); }}
        />
      )}

      {/* ── Delete confirm ── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'folder' ? 'Delete Folder' : 'Delete File'}
        message={
          deleteTarget?.type === 'folder'
            ? `Delete folder "${(deleteTarget.item as Folder).name}" and ALL its contents? Storage will be cleaned up. This cannot be undone.`
            : `Delete "${(deleteTarget?.item as ProjectFile)?.file_name}"? This cannot be undone.`
        }
        loading={deleteFile.isPending || deleteFolder.isPending}
      />

      {/* ── Move modal ── */}
      {project && moveTarget && (
        <MoveToModal
          open={!!moveTarget}
          onClose={() => { setMoveTarget(null); setSelectedIds(new Set()); }}
          projectId={project.id}
          targets={moveTarget.targets}
          forbiddenIds={moveTarget.forbiddenIds}
        />
      )}

      {/* ── Share modal ── */}
      {project && shareTarget && (
        <FileShareModal
          open={!!shareTarget}
          onClose={() => setShareTarget(null)}
          projectId={project.id}
          file={shareTarget.file ?? null}
          folder={shareTarget.folder ?? null}
        />
      )}
    </div>
  );
}

// ── Shared ViewProps ──────────────────────────────────────────────────────────

interface ViewProps {
  folders: Folder[];
  files: ProjectFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenFolder: (f: Folder) => void;
  onPreviewFile: (f: ProjectFile) => void;
  onDownloadFile: (f: ProjectFile) => void;
  onDeleteFolder: (f: Folder) => void;
  onDeleteFile: (f: ProjectFile) => void;
  onShareFolder: (f: Folder) => void;
  onShareFile: (f: ProjectFile) => void;
  onRenameFile: (f: ProjectFile) => void;
  onRenameFolder: (f: Folder) => void;
  onMoveFile: (f: ProjectFile) => void;
  onMoveFolder: (f: Folder) => void;
}

// ── Grid view ─────────────────────────────────────────────────────────────────

function GridView(props: ViewProps) {
  const { folders, files, selectedIds, onToggleSelect } = props;
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const loadThumb = useCallback(async (file: ProjectFile) => {
    if (thumbUrls[file.id] || detectFileType(file.file_name, file.mime_type).category !== 'image') return;
    try {
      const url = await getSignedUrl(file.file_path, 600);
      setThumbUrls((prev) => ({ ...prev, [file.id]: url }));
    } catch { /* skip */ }
  }, [thumbUrls]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {folders.map((folder) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <button
            onClick={() => props.onOpenFolder(folder)}
            className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-white border border-ink-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/40 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md p-3"
          >
            <Icon name="folder" size={38} className="text-amber-400" fill />
            <span className="text-xs text-ink-900 font-semibold truncate w-full text-center leading-tight">{folder.name}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === folder.id ? null : folder.id); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-md bg-white border border-ink-200 text-ink-500 opacity-0 group-hover:opacity-100 hover:text-ink-900 transition-opacity shadow-sm z-10"
          >
            <Icon name="more_vert" size={13} />
          </button>
          {menuOpen === folder.id && (
            <ItemMenu
              onClose={() => setMenuOpen(null)}
              items={[
                { icon: 'drive_file_move', label: 'Move to…', onClick: () => { setMenuOpen(null); props.onMoveFolder(folder); } },
                { icon: 'edit', label: 'Rename', onClick: () => { setMenuOpen(null); props.onRenameFolder(folder); } },
                { icon: 'share', label: 'Share', onClick: () => { setMenuOpen(null); props.onShareFolder(folder); } },
                { icon: 'delete', label: 'Delete', danger: true, onClick: () => { setMenuOpen(null); props.onDeleteFolder(folder); } },
              ]}
            />
          )}
        </motion.div>
      ))}

      {files.map((file) => {
        loadThumb(file);
        const isSelected = selectedIds.has(file.id);
        const info = detectFileType(file.file_name, file.mime_type);
        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            {/* Checkbox */}
            <div
              onClick={(e) => { e.stopPropagation(); onToggleSelect(file.id); }}
              className={cn(
                'absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer',
                'opacity-0 group-hover:opacity-100',
                isSelected ? 'bg-blue-500 border-blue-500 opacity-100' : 'bg-white border-ink-300',
              )}
            >
              {isSelected && <Icon name="check" size={12} className="text-white" />}
            </div>

            <button
              onClick={() => props.onPreviewFile(file)}
              className={cn(
                'w-full aspect-square flex flex-col items-center justify-center bg-white border rounded-xl transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md overflow-hidden',
                isSelected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-ink-200 hover:border-ink-400',
              )}
            >
              {info.category === 'image' && thumbUrls[file.id] ? (
                <img src={thumbUrls[file.id]} alt={file.file_name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-3 w-full h-full justify-center">
                  <div className="w-12 h-12 rounded-xl bg-ink-50 border border-ink-100 flex items-center justify-center">
                    <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={26} />
                  </div>
                  <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">
                    {file.file_name.split('.').pop() ?? 'FILE'}
                  </span>
                </div>
              )}
              {info.category === 'image' && thumbUrls[file.id] && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] text-white truncate font-medium">{file.file_name}</p>
                </div>
              )}
            </button>

            {info.category !== 'image' && (
              <p className="text-[11px] text-ink-600 truncate text-center mt-1.5 px-1 font-medium leading-tight">{file.file_name}</p>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === file.id ? null : file.id); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-md bg-white border border-ink-200 text-ink-500 opacity-0 group-hover:opacity-100 hover:text-ink-900 transition-opacity shadow-sm z-10"
            >
              <Icon name="more_vert" size={13} />
            </button>
            {menuOpen === file.id && (
              <ItemMenu
                onClose={() => setMenuOpen(null)}
                items={[
                  { icon: 'open_in_new', label: 'Open preview', onClick: () => { setMenuOpen(null); props.onPreviewFile(file); } },
                  { icon: 'drive_file_move', label: 'Move to…', onClick: () => { setMenuOpen(null); props.onMoveFile(file); } },
                  { icon: 'edit', label: 'Rename', onClick: () => { setMenuOpen(null); props.onRenameFile(file); } },
                  { icon: 'share', label: 'Share', onClick: () => { setMenuOpen(null); props.onShareFile(file); } },
                  { icon: 'download', label: 'Download', onClick: () => { setMenuOpen(null); props.onDownloadFile(file); } },
                  { icon: 'delete', label: 'Delete', danger: true, onClick: () => { setMenuOpen(null); props.onDeleteFile(file); } },
                ]}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView(props: ViewProps) {
  const { folders, files, selectedIds, onToggleSelect } = props;

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[auto_1fr_90px_90px_auto] gap-3 px-3 py-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wide border-b border-ink-100">
        <div className="w-8" />
        <span>Name</span>
        <span className="hidden sm:block">Size</span>
        <span className="hidden sm:block">Modified</span>
        <div className="w-16" />
      </div>

      {folders.map((folder) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
          className="group grid grid-cols-[auto_1fr_90px_90px_auto] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-ink-50 transition-colors cursor-pointer"
          onClick={() => props.onOpenFolder(folder)}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <Icon name="folder" size={18} className="text-amber-400" fill />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate">{folder.name}</p>
            <p className="text-[11px] text-ink-400">Folder</p>
          </div>
          <span className="hidden sm:block text-xs text-ink-400">—</span>
          <span className="hidden sm:block text-xs text-ink-400">{formatRelative(folder.created_at)}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn icon="drive_file_move" title="Move" onClick={(e) => { e.stopPropagation(); props.onMoveFolder(folder); }} />
            <ActionBtn icon="edit" title="Rename" onClick={(e) => { e.stopPropagation(); props.onRenameFolder(folder); }} />
            <ActionBtn icon="share" title="Share" onClick={(e) => { e.stopPropagation(); props.onShareFolder(folder); }} />
            <ActionBtn icon="delete" title="Delete" danger onClick={(e) => { e.stopPropagation(); props.onDeleteFolder(folder); }} />
          </div>
        </motion.div>
      ))}

      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);
        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            className={cn(
              'group grid grid-cols-[auto_1fr_90px_90px_auto] gap-3 items-center px-3 py-2.5 rounded-lg transition-colors',
              isSelected ? 'bg-blue-50' : 'hover:bg-ink-50',
            )}
          >
            <div
              className="w-8 h-8 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-center flex-shrink-0 cursor-pointer relative"
              onClick={() => onToggleSelect(file.id)}
            >
              {isSelected ? (
                <div className="w-full h-full rounded-lg bg-blue-500 flex items-center justify-center">
                  <Icon name="check" size={14} className="text-white" />
                </div>
              ) : (
                <>
                  <span className="group-hover:opacity-0 transition-opacity">
                    <FileTypeIcon mimeType={file.mime_type} fileName={file.file_name} fileType={file.file_type} size={17} />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-full h-full rounded-lg border-2 border-ink-300 flex items-center justify-center">
                      <Icon name="check_box_outline_blank" size={14} className="text-ink-400" />
                    </div>
                  </span>
                </>
              )}
            </div>
            <button onClick={() => props.onPreviewFile(file)} className="text-left min-w-0">
              <p className="text-sm font-semibold text-ink-900 truncate">{file.file_name}</p>
              <p className="text-[11px] text-ink-400 capitalize">{detectFileType(file.file_name, file.mime_type).label}</p>
            </button>
            <span className="hidden sm:block text-xs text-ink-400">{formatFileSize(file.file_size)}</span>
            <span className="hidden sm:block text-xs text-ink-400">{formatRelative(file.created_at)}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionBtn icon="drive_file_move" title="Move" onClick={() => props.onMoveFile(file)} />
              <ActionBtn icon="edit" title="Rename" onClick={() => props.onRenameFile(file)} />
              <ActionBtn icon="share" title="Share" onClick={() => props.onShareFile(file)} />
              <ActionBtn icon="download" title="Download" onClick={() => props.onDownloadFile(file)} />
              <ActionBtn icon="delete" title="Delete" danger onClick={() => props.onDeleteFile(file)} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Context (3-dot) menu ──────────────────────────────────────────────────────

interface ItemMenuItem { icon: string; label: string; danger?: boolean; onClick: () => void; }

function ItemMenu({ items, onClose }: { items: ItemMenuItem[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-8 right-0 z-20 bg-white border border-ink-200 rounded-xl shadow-2xl py-1.5 min-w-[160px] overflow-hidden">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors',
              item.danger ? 'text-red-500 hover:bg-red-50' : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
            )}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ── Small inline action button ────────────────────────────────────────────────

function ActionBtn({ icon, title, onClick, danger }: { icon: string; title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        danger ? 'text-ink-400 hover:text-red-500 hover:bg-red-50' : 'text-ink-400 hover:text-ink-900 hover:bg-ink-100',
      )}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
