import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useProject } from '../hooks/useProjects';
import {
  useFolders,
  useProjectFiles,
  useCreateFolder,
  useDeleteFolder,
  useAddProjectFile,
  useDeleteProjectFile,
} from '../hooks/useProjectFiles';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { FileGridSkeleton, ListRowSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { FileShareModal } from '../components/files/FileShareModal';
import { Lightbox } from '../components/prompts/Lightbox';
import { uploadProjectFile, getSignedUrl, downloadFile, getFileCategory, formatFileSize } from '../lib/storage';
import { cn, PROJECT_COLORS } from '../lib/utils';
import { formatRelative } from '../lib/utils';
import type { Folder, ProjectFile, FileType } from '../lib/database.types';

// ── File icon & color helpers ─────────────────────────────────────────────────

function fileIconName(ft: FileType | string, mimeType?: string | null): string {
  const m = mimeType ?? '';
  if (ft === 'image') return 'image';
  if (ft === 'video') return 'smart_display';
  if (ft === 'audio') return 'music_note';
  if (ft === 'document') {
    if (m === 'application/pdf') return 'picture_as_pdf';
    if (m.includes('spreadsheet') || m.includes('excel')) return 'table_chart';
    if (m.includes('presentation') || m.includes('powerpoint')) return 'slideshow';
    return 'description';
  }
  return 'attach_file';
}

function fileColor(ft: FileType | string): string {
  switch (ft) {
    case 'image': return 'text-emerald-400 bg-emerald-400/10';
    case 'video': return 'text-blue-400 bg-blue-400/10';
    case 'audio': return 'text-pink-400 bg-pink-400/10';
    case 'document': return 'text-amber-400 bg-amber-400/10';
    default: return 'text-gray-400 bg-gray-700/50';
  }
}

// ── Upload queue item ─────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';

export function ProjectFilesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project, isLoading: projectLoading } = useProject(slug ?? '');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FileType | ''>('');

  // Data
  const { data: folders = [], isLoading: foldersLoading } = useFolders(project?.id ?? '');
  const { data: files = [], isLoading: filesLoading } = useProjectFiles(project?.id ?? '', activeFolderId);
  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  // Mutations
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const addFile = useAddProjectFile();
  const deleteFile = useDeleteProjectFile();

  // UI state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; item: ProjectFile | Folder } | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<(ProjectFile & { signedUrl: string })[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<(ProjectFile & { signedUrl: string }) | null>(null);
  const [shareTarget, setShareTarget] = useState<{ type: 'project' | 'file' | 'folder'; file?: ProjectFile; folder?: Folder } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered files
  const visibleFiles = files.filter((f) => {
    const matchSearch = !search || f.file_name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || f.file_type === filterType;
    return matchSearch && matchType;
  });

  const visibleFolders = !activeFolderId
    ? folders.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  // ── Upload logic ──────────────────────────────────────────────────────────

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const processUpload = useCallback(async (file: File) => {
    if (!project || !user) return;
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploads((prev) => [...prev, { id: uid, name: file.name, size: file.size, progress: 0, status: 'uploading' }]);

    try {
      updateUpload(uid, { progress: 30 });
      const path = await uploadProjectFile(user.id, project.id, file);
      updateUpload(uid, { progress: 80 });

      const category = getFileCategory(file.type);
      await addFile.mutateAsync({
        project_id: project.id,
        folder_id: activeFolderId,
        file_path: path,
        file_name: file.name,
        file_type: category,
        file_size: file.size,
        mime_type: file.type,
      });

      updateUpload(uid, { progress: 100, status: 'done' });
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uid)), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateUpload(uid, { status: 'error', error: msg });
      toast.error(`Failed to upload ${file.name}`);
    }
  }, [project, user, activeFolderId, addFile, updateUpload]);

  const handleFiles = (list: FileList | File[]) => Array.from(list).forEach(processUpload);

  // ── Create folder ─────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!project || !newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync({ projectId: project.id, name: newFolderName.trim() });
      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderOpen(false);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

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
        toast.success('Folder deleted');
      }
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  // ── Preview ───────────────────────────────────────────────────────────────

  const openPreview = async (file: ProjectFile) => {
    try {
      const signedUrl = await getSignedUrl(file.file_path, 3600);
      const enriched = { ...file, signedUrl };

      if (file.file_type === 'image') {
        const imageFiles = visibleFiles.filter((f) => f.file_type === 'image');
        const withUrls = await Promise.all(
          imageFiles.map(async (f) => {
            const url = f.id === file.id ? signedUrl : await getSignedUrl(f.file_path, 3600).catch(() => '');
            return { ...f, signedUrl: url };
          }),
        );
        const idx = withUrls.findIndex((f) => f.id === file.id);
        setLightboxImages(withUrls.filter((f) => f.signedUrl));
        setLightboxIndex(idx >= 0 ? idx : 0);
      } else {
        setPreviewFile(enriched);
      }
    } catch {
      toast.error('Could not open preview');
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      await downloadFile(file.file_path, file.file_name);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  if (projectLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <div className="h-40 rounded-2xl bg-gray-800/60 animate-pulse" />
        <FileGridSkeleton count={12} />
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center text-gray-400">Project not found.</div>;

  const totalItems = visibleFolders.length + visibleFiles.length;

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-950">
      {/* ── Top bar ── */}
      <div className={cn(
        'px-4 lg:px-8 py-5 bg-gradient-to-r text-white relative overflow-hidden',
        PROJECT_COLORS[project.color] ?? PROJECT_COLORS.gray,
      )}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex flex-col gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-white/80 overflow-x-auto scrollbar-none flex-nowrap min-w-0">
            <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors whitespace-nowrap">
              My Drive
            </button>
            <span className="opacity-50 flex-shrink-0">/</span>
            <button
              onClick={() => setActiveFolderId(null)}
              className={cn('hover:text-white transition-colors truncate max-w-[120px] xs:max-w-[180px]', !activeFolderId && 'text-white font-semibold')}
            >
              {project.name}
            </button>
            {activeFolder && (
              <>
                <span className="opacity-50 flex-shrink-0">/</span>
                <span className="text-white font-semibold truncate max-w-[120px] xs:max-w-[200px]">{activeFolder.name}</span>
              </>
            )}
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <Icon name="arrow_back" size={18} className="text-white" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold truncate">{activeFolder ? activeFolder.name : project.name}</h1>
              <span className="text-xs sm:text-sm text-white/60 flex-shrink-0">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={viewMode === 'grid' ? 'List view' : 'Grid view'}
              >
                <Icon name={viewMode === 'grid' ? 'view_list' : 'grid_view'} size={18} />
              </button>
              {!activeFolderId && (
                <button
                  onClick={() => setNewFolderOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  <Icon name="create_new_folder" size={16} />
                  New Folder
                </button>
              )}
              <button
                onClick={() => setShareTarget({ type: 'project' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                title="Share"
              >
                <Icon name="share" size={16} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg"
              >
                <Icon name="upload" size={16} />
                Upload
              </button>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1 sm:max-w-sm">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-colors"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FileType | '')}
              className="h-9 px-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none"
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

      {/* ── Upload progress bar strip ── */}
      {/* ── Upload progress strip ── */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 overflow-hidden"
          >
            <div className="px-4 lg:px-8 py-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {uploads.map((u) => (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, x: -16, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 16, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors',
                      u.status === 'error' ? 'bg-red-500/5 border-red-500/20'
                      : u.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-gray-800/60 border-gray-700/60',
                    )}
                  >
                    {/* Animated status icon */}
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      u.status === 'error' ? 'bg-red-500/20 text-red-400'
                      : u.status === 'done' ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-blue-500/20 text-blue-400',
                    )}>
                      <AnimatePresence mode="wait" initial={false}>
                        {u.status === 'uploading' && (
                          <motion.span key="up" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </motion.span>
                        )}
                        {u.status === 'done' && (
                          <motion.span key="done" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400 }}>
                            <Icon name="check_circle" size={14} fill />
                          </motion.span>
                        )}
                        {u.status === 'error' && (
                          <motion.span key="err" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Icon name="error" size={14} fill />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-300 truncate font-medium">{u.name}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatFileSize(u.size)}</span>
                      </div>
                      {u.status === 'uploading' && (
                        <div className="mt-1 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                            initial={{ width: '0%' }}
                            animate={{ width: `${u.progress}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                          />
                        </div>
                      )}
                      {u.status === 'error' && <p className="text-xs text-red-400 mt-0.5">{u.error}</p>}
                    </div>

                    <AnimatePresence>
                      {(u.status === 'error' || u.status === 'done') && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          onClick={() => setUploads((p) => p.filter((x) => x.id !== u.id))}
                          className="text-gray-500 hover:text-gray-300 flex-shrink-0 p-1 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Icon name="close" size={12} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content area ── */}
      <div
        className="flex-1 relative"
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-none flex items-center justify-center"
            >
              <div className="text-center">
                <Icon name="cloud_upload" size={48} className="text-blue-400 mx-auto mb-3" />
                <p className="text-blue-300 text-lg font-semibold">Drop files here to upload</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 lg:p-8">
          {foldersLoading || filesLoading ? (
            viewMode === 'grid' ? <FileGridSkeleton count={12} /> : <ListRowSkeleton count={8} />
          ) : totalItems === 0 ? (
            <EmptyState
              icon={<Icon name="folder_open" size={28} className="text-gray-500" />}
              title={activeFolderId ? 'This folder is empty' : 'No files yet'}
              description={activeFolderId ? 'Upload files to this folder.' : 'Upload files or create folders to get started.'}
              action={{ label: 'Upload files', onClick: () => fileInputRef.current?.click() }}
            />
          ) : viewMode === 'grid' ? (
            <GridView
              folders={visibleFolders}
              files={visibleFiles}
              onOpenFolder={(f) => setActiveFolderId(f.id)}
              onPreviewFile={openPreview}
              onDownloadFile={handleDownload}
              onDeleteFolder={(f) => setDeleteTarget({ type: 'folder', item: f })}
              onDeleteFile={(f) => setDeleteTarget({ type: 'file', item: f })}
              onShareFolder={(f) => setShareTarget({ type: 'folder', folder: f })}
              onShareFile={(f) => setShareTarget({ type: 'file', file: f })}
            />
          ) : (
            <ListView
              folders={visibleFolders}
              files={visibleFiles}
              onOpenFolder={(f) => setActiveFolderId(f.id)}
              onPreviewFile={openPreview}
              onDownloadFile={handleDownload}
              onDeleteFolder={(f) => setDeleteTarget({ type: 'folder', item: f })}
              onDeleteFile={(f) => setDeleteTarget({ type: 'file', item: f })}
              onShareFolder={(f) => setShareTarget({ type: 'folder', folder: f })}
              onShareFile={(f) => setShareTarget({ type: 'file', file: f })}
            />
          )}
        </div>
      </div>

      {/* ── Mobile FABs ── */}
      <div className="lg:hidden fixed bottom-20 right-4 flex flex-col gap-3 z-10">
        {!activeFolderId && (
          <button
            onClick={() => setNewFolderOpen(true)}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          >
            <Icon name="create_new_folder" size={20} />
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl shadow-blue-900/40 flex items-center justify-center transition-all active:scale-95"
        >
          <Icon name="upload" size={24} />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* ── New folder modal ── */}
      <AnimatePresence>
        {newFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setNewFolderOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                  <Icon name="create_new_folder" size={20} />
                </div>
                <h2 className="text-lg font-semibold text-white">New Folder</h2>
              </div>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name"
                className="w-full h-11 px-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setNewFolderOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  loading={createFolder.isPending}
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Preview modal for non-image files ── */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPreviewFile(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', fileColor(previewFile.file_type))}>
                    <Icon name={fileIconName(previewFile.file_type, previewFile.mime_type)} size={16} />
                  </div>
                  <p className="text-sm font-medium text-white truncate">{previewFile.file_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                  >
                    <Icon name="download" size={16} />
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {previewFile.file_type === 'video' ? (
                  <video src={previewFile.signedUrl} controls className="w-full rounded-xl max-h-[70vh]" />
                ) : previewFile.file_type === 'audio' ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <div className="w-24 h-24 rounded-full bg-pink-400/10 flex items-center justify-center">
                      <Icon name="music_note" size={40} className="text-pink-400" />
                    </div>
                    <audio src={previewFile.signedUrl} controls className="w-full" />
                  </div>
                ) : previewFile.mime_type === 'application/pdf' ? (
                  <iframe src={previewFile.signedUrl} className="w-full h-[70vh] rounded-xl" title={previewFile.file_name} />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', fileColor(previewFile.file_type))}>
                      <Icon name={fileIconName(previewFile.file_type, previewFile.mime_type)} size={36} />
                    </div>
                    <p className="text-gray-400 text-sm">Preview not available</p>
                    <Button onClick={() => handleDownload(previewFile)} size="sm">
                      <Icon name="download" size={14} />
                      Download file
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox for images */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setLightboxImages([]); }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'folder' ? 'Delete Folder' : 'Delete File'}
        message={
          deleteTarget?.type === 'folder'
            ? `Delete folder "${(deleteTarget.item as Folder).name}" and all files inside? This cannot be undone.`
            : `Delete "${(deleteTarget?.item as ProjectFile)?.file_name}"? This cannot be undone.`
        }
        loading={deleteFile.isPending || deleteFolder.isPending}
      />

      {/* File share modal */}
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

// ── Grid view ─────────────────────────────────────────────────────────────────

interface ViewProps {
  folders: Folder[];
  files: ProjectFile[];
  onOpenFolder: (f: Folder) => void;
  onPreviewFile: (f: ProjectFile) => void;
  onDownloadFile: (f: ProjectFile) => void;
  onDeleteFolder: (f: Folder) => void;
  onDeleteFile: (f: ProjectFile) => void;
  onShareFolder: (f: Folder) => void;
  onShareFile: (f: ProjectFile) => void;
}

function GridView({ folders, files, onOpenFolder, onPreviewFile, onDownloadFile, onDeleteFolder, onDeleteFile, onShareFolder, onShareFile }: ViewProps) {
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const loadThumb = useCallback(async (file: ProjectFile) => {
    if (thumbUrls[file.id] || file.file_type !== 'image') return;
    try {
      const url = await getSignedUrl(file.file_path, 600);
      setThumbUrls((prev) => ({ ...prev, [file.id]: url }));
    } catch { /* skip */ }
  }, [thumbUrls]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* Folders */}
      {folders.map((folder) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <button
            onDoubleClick={() => onOpenFolder(folder)}
            onClick={() => onOpenFolder(folder)}
            className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 rounded-2xl hover:border-amber-500/40 hover:bg-gray-800/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/30 p-3"
          >
            <Icon name="folder" size={36} className="text-amber-400" fill />
            <span className="text-xs text-gray-300 font-medium truncate w-full text-center">{folder.name}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === folder.id ? null : folder.id); }}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
          >
            <Icon name="more_vert" size={14} />
          </button>
          {menuOpen === folder.id && (
            <ContextMenu
              onClose={() => setMenuOpen(null)}
              items={[
                { icon: 'share', label: 'Share', onClick: () => { setMenuOpen(null); onShareFolder(folder); } },
                { icon: 'delete', label: 'Delete', danger: true, onClick: () => { setMenuOpen(null); onDeleteFolder(folder); } },
              ]}
            />
          )}
        </motion.div>
      ))}

      {/* Files */}
      {files.map((file) => {
        loadThumb(file);
        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <button
              onClick={() => onPreviewFile(file)}
              className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-600 hover:bg-gray-800/80 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/30 overflow-hidden"
            >
              {file.file_type === 'image' && thumbUrls[file.id] ? (
                <img src={thumbUrls[file.id]} alt={file.file_name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', fileColor(file.file_type))}>
                    <Icon name={fileIconName(file.file_type, file.mime_type)} size={24} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium truncate w-full text-center">
                    {file.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'}
                  </span>
                </div>
              )}
              {file.file_type === 'image' && thumbUrls[file.id] && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">{file.file_name}</p>
                </div>
              )}
            </button>
            {file.file_type !== 'image' && (
              <p className="text-xs text-gray-500 truncate text-center mt-1 px-1">{file.file_name}</p>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === file.id ? null : file.id); }}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity z-10"
            >
              <Icon name="more_vert" size={14} />
            </button>
            {menuOpen === file.id && (
              <ContextMenu
                onClose={() => setMenuOpen(null)}
                items={[
                  { icon: 'share', label: 'Share', onClick: () => { setMenuOpen(null); onShareFile(file); } },
                  { icon: 'download', label: 'Download', onClick: () => { setMenuOpen(null); onDownloadFile(file); } },
                  { icon: 'delete', label: 'Delete', danger: true, onClick: () => { setMenuOpen(null); onDeleteFile(file); } },
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

function ListView({ folders, files, onOpenFolder, onPreviewFile, onDownloadFile, onDeleteFolder, onDeleteFile, onShareFolder, onShareFile }: ViewProps) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_100px_80px] gap-3 sm:gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <div className="w-8" />
        <span>Name</span>
        <span className="hidden sm:block">Size</span>
        <span className="hidden sm:block">Modified</span>
      </div>

      {/* Folders */}
      {folders.map((folder) => (
        <motion.button
          key={folder.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onOpenFolder(folder)}
          className="group w-full grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_100px_80px] gap-3 sm:gap-4 items-center px-3 py-3 rounded-xl hover:bg-gray-800/60 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <Icon name="folder" size={18} className="text-amber-400" fill />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white">{folder.name}</p>
            <p className="text-xs text-gray-500">Folder</p>
          </div>
          <span className="hidden sm:block text-xs text-gray-500">—</span>
          <span className="hidden sm:block text-xs text-gray-500">{formatRelative(folder.created_at)}</span>
          <div className="absolute right-4 opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onShareFolder(folder); }}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
              title="Share folder"
            >
              <Icon name="share" size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder); }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        </motion.button>
      ))}

      {/* Files */}
      {files.map((file) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="group relative grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_100px_80px] gap-3 sm:gap-4 items-center px-3 py-3 rounded-xl hover:bg-gray-800/60 transition-colors"
        >
          <button onClick={() => onPreviewFile(file)} className="contents">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', fileColor(file.file_type))}>
              <Icon name={fileIconName(file.file_type, file.mime_type)} size={16} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white">{file.file_name}</p>
              <p className="text-xs text-gray-500 capitalize">{file.file_type}</p>
            </div>
            <span className="hidden sm:block text-xs text-gray-500">{file.file_size ? formatFileSize(file.file_size) : '—'}</span>
            <span className="hidden sm:block text-xs text-gray-500">{formatRelative(file.created_at)}</span>
          </button>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
            <button
              onClick={() => onShareFile(file)}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
              title="Share file"
            >
              <Icon name="share" size={14} />
            </button>
            <button
              onClick={() => onDownloadFile(file)}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-200 transition-colors"
            >
              <Icon name="download" size={14} />
            </button>
            <button
              onClick={() => onDeleteFile(file)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface ContextMenuItem {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

function ContextMenu({ items, onClose }: { items: ContextMenuItem[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-8 right-0 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-32 overflow-hidden">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            )}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
