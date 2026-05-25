import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getSignedUrl, downloadFile, formatFileSize } from '../lib/storage';
import { verifySharePassword } from '../hooks/useFileShares';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import type { FileShare, ProjectFile, Folder } from '../lib/database.types';

type ShareStatus = 'loading' | 'password' | 'expired' | 'notfound' | 'ready' | 'error';
type AccessType = 'anyone' | 'can_edit' | 'password';

interface FileWithUrl extends ProjectFile { signedUrl: string }

function fileIconName(ft: string, mimeType?: string | null): string {
  if (ft === 'image') return 'image';
  if (ft === 'video') return 'smart_display';
  if (ft === 'audio') return 'music_note';
  if (ft === 'document') {
    const m = mimeType ?? '';
    if (m === 'application/pdf') return 'picture_as_pdf';
    if (m.includes('spreadsheet') || m.includes('excel')) return 'table_chart';
    if (m.includes('presentation') || m.includes('powerpoint')) return 'slideshow';
    return 'description';
  }
  return 'attach_file';
}

function fileColor(ft: string): string {
  switch (ft) {
    case 'image':    return 'text-emerald-400 bg-emerald-400/10';
    case 'video':    return 'text-blue-400 bg-blue-400/10';
    case 'audio':    return 'text-pink-400 bg-pink-400/10';
    case 'document': return 'text-amber-400 bg-amber-400/10';
    default:         return 'text-gray-400 bg-gray-700/50';
  }
}

// ── Rename modal ────────────────────────────────────────────────────────────
function RenameModal({
  file,
  onClose,
  onRename,
}: {
  file: FileWithUrl | null;
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState(file?.file_name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (file) setName(file.file_name); }, [file?.id]);

  const save = async () => {
    if (!file || !name.trim()) return;
    setSaving(true);
    await onRename(file.id, name.trim());
    setSaving(false);
    onClose();
  };

  if (!file) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-semibold text-white mb-4">Rename File</h3>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Rename'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Delete confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({
  file,
  onClose,
  onDelete,
}: {
  file: FileWithUrl | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    if (!file) return;
    setDeleting(true);
    await onDelete(file.id);
    setDeleting(false);
    onClose();
  };

  if (!file) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
            <Icon name="delete" size={18} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Delete file?</h3>
          <p className="text-sm text-gray-400 mb-5">
            "<span className="text-gray-200">{file.file_name}</span>" will be permanently removed.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main SharePage ──────────────────────────────────────────────────────────
export function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [status, setStatus] = useState<ShareStatus>('loading');
  const [share, setShare] = useState<FileShare | null>(null);
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [folderName, setFolderName] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('');

  // Edit-mode state
  const [renameTarget, setRenameTarget] = useState<FileWithUrl | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileWithUrl | null>(null);

  useEffect(() => {
    if (!shareId) { setStatus('notfound'); return; }
    loadShare();
  }, [shareId]);

  const loadShare = async () => {
    setStatus('loading');
    const { data, error } = await supabase
      .from('file_shares')
      .select('*')
      .eq('id', shareId!)
      .maybeSingle();

    if (error || !data) { setStatus('notfound'); return; }
    const s = data as FileShare;
    setShare(s);

    if (s.expires_at && new Date(s.expires_at) < new Date()) {
      setStatus('expired'); return;
    }

    if (s.access_type === 'password') {
      setStatus('password'); return;
    }

    await loadContent(s);
  };

  const loadContent = async (s: FileShare) => {
    try {
      await supabase.rpc('increment_share_view', { share_id: s.id });

      const { data: proj } = await supabase
        .from('projects')
        .select('name')
        .eq('id', s.project_id)
        .maybeSingle();
      setProjectName(proj?.name ?? '');

      let rawFiles: ProjectFile[] = [];

      if (s.file_id) {
        const { data } = await supabase.from('project_files').select('*').eq('id', s.file_id).maybeSingle();
        if (data) rawFiles = [data as ProjectFile];
      } else if (s.folder_id) {
        const { data: folder } = await supabase.from('folders').select('name').eq('id', s.folder_id).maybeSingle();
        if (folder) setFolderName((folder as Folder).name);
        const { data } = await supabase.from('project_files').select('*').eq('folder_id', s.folder_id).order('created_at', { ascending: true });
        rawFiles = (data ?? []) as ProjectFile[];
      } else {
        const { data } = await supabase.from('project_files').select('*').eq('project_id', s.project_id).is('folder_id', null).order('created_at', { ascending: true });
        rawFiles = (data ?? []) as ProjectFile[];
      }

      const withUrls: FileWithUrl[] = await Promise.all(
        rawFiles.map(async (f) => {
          try {
            const signedUrl = (f.file_type === 'image' || f.file_type === 'video')
              ? await getSignedUrl(f.file_path, 3600)
              : '';
            return { ...f, signedUrl };
          } catch {
            return { ...f, signedUrl: '' };
          }
        }),
      );

      setFiles(withUrls);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!share || !passwordInput.trim()) return;
    setVerifying(true);
    setPasswordError('');
    try {
      const ok = await verifySharePassword(share.password_hash!, passwordInput);
      if (!ok) {
        setPasswordError('Incorrect password. Try again.');
        setVerifying(false);
        return;
      }
      await loadContent(share);
    } catch {
      setPasswordError('Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Edit actions (only active when access_type === 'can_edit')
  const handleRename = async (id: string, newName: string) => {
    const { error } = await supabase
      .from('project_files')
      .update({ file_name: newName })
      .eq('id', id);
    if (error) { console.error(error); return; }
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, file_name: newName } : f));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_files').delete().eq('id', id);
    if (error) { console.error(error); return; }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canEdit = share?.access_type === 'can_edit';
  const images = files.filter((f) => f.file_type === 'image' && f.signedUrl);
  const others = files.filter((f) => f.file_type !== 'image');

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading shared content…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Icon name="link_off" size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link not found</h1>
          <p className="text-gray-400 text-sm">This share link doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Icon name="schedule" size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link expired</h1>
          <p className="text-gray-400 text-sm">This share link is no longer active.</p>
        </div>
      </div>
    );
  }

  // ── Password gate ──────────────────────────────────────────────────────────
  if (status === 'password') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-sm"
        >
          {/* Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Icon name="lock" size={24} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white text-center mb-1">
              {share?.share_name || 'Protected File'}
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              Enter the password to view this content
            </p>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Enter password…"
                  autoFocus
                  className={cn(
                    'w-full bg-gray-800 border rounded-xl px-4 py-3 pr-11 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500',
                    passwordError ? 'border-red-500/50' : 'border-gray-700',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
                </button>
              </div>

              <AnimatePresence>
                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    <Icon name="error" size={13} />
                    {passwordError}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button className="w-full" loading={verifying} onClick={handlePasswordSubmit}>
                <Icon name="lock_open" size={16} />
                Unlock
              </Button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-600 flex items-center justify-center gap-1.5">
            <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
              <Icon name="lock" size={9} className="text-white" fill />
            </div>
            Shared via PromptVault
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────
  const displayName = share?.share_name || folderName || 'Shared Files';
  const accessLabel: Record<AccessType, { label: string; icon: string; cls: string }> = {
    anyone:   { label: 'View only',        icon: 'visibility', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    can_edit: { label: 'Can edit',         icon: 'edit',       cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    password: { label: 'Password protected',icon: 'lock',      cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };
  const currentAccess = accessLabel[(share?.access_type as AccessType) ?? 'anyone'];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="lock" size={15} className="text-white" fill />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              {projectName && <p className="text-xs text-gray-500 truncate">from {projectName}</p>}
            </div>
          </div>
          <span className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0',
            currentAccess.cls,
          )}>
            <Icon name={currentAccess.icon} size={12} />
            {currentAccess.label}
          </span>
        </div>
      </header>

      {/* Edit-mode banner */}
      <AnimatePresence>
        {canEdit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-600/10 border-b border-blue-500/20"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-3">
              <Icon name="edit" size={14} className="text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300 font-medium">
                You have edit access — you can rename and delete files in this share.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Icon name="folder_open" size={15} />
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          {share?.allow_download ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Icon name="download" size={15} />
              Downloads allowed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-500">
              <Icon name="download_off" size={15} />
              View only
            </span>
          )}
        </div>

        {files.length === 0 && (
          <div className="text-center py-16">
            <Icon name="folder_open" size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No files in this share</p>
          </div>
        )}

        {/* Image gallery */}
        {images.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <Icon name="photo_library" size={15} />
              Images
              <span className="text-xs font-normal text-gray-500">({images.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-800"
                >
                  <img
                    src={img.signedUrl}
                    alt={img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    loading="lazy"
                    onClick={() => setLightboxIdx(i)}
                  />
                  {/* Hover toolbar */}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white/80 truncate flex-1 mr-1">{img.file_name}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      {canEdit && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenameTarget(img); }}
                            className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-blue-600/80 transition-colors"
                            title="Rename"
                          >
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(img); }}
                            className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-red-600/80 transition-colors"
                            title="Delete"
                          >
                            <Icon name="delete" size={12} />
                          </button>
                        </>
                      )}
                      {share?.allow_download && (
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadFile(img.file_path, img.file_name); }}
                          className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          title="Download"
                        >
                          <Icon name="download" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Other files */}
        {others.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
              <Icon name="attach_file" size={15} />
              Files
              <span className="text-xs font-normal text-gray-500">({others.length})</span>
            </h2>
            <div className="space-y-2">
              {others.map((f, i) => (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-700 transition-colors group"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', fileColor(f.file_type))}>
                    <Icon name={fileIconName(f.file_type, f.mime_type)} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{f.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {f.file_type}{f.file_size ? ` · ${formatFileSize(f.file_size)}` : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setRenameTarget(f)}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Rename"
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      </>
                    )}
                    {share?.allow_download && (
                      <button
                        onClick={() => downloadFile(f.file_path, f.file_name)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Icon name="download" size={13} />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && images[lightboxIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={images[lightboxIdx].signedUrl}
              alt={images[lightboxIdx].file_name}
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <Icon name="close" size={20} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i! - 1 + images.length) % images.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <Icon name="chevron_left" size={22} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i! + 1) % images.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <Icon name="chevron_right" size={22} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modals */}
      {renameTarget && (
        <RenameModal file={renameTarget} onClose={() => setRenameTarget(null)} onRename={handleRename} />
      )}
      {deleteTarget && (
        <DeleteConfirm file={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
      )}

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-gray-800/40 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
            <Icon name="lock" size={9} className="text-white" fill />
          </div>
          Shared via PromptVault
        </div>
      </footer>
    </div>
  );
}
