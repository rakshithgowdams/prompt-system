import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatFileSize } from '../lib/storage';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

type ShareStatus = 'loading' | 'password' | 'expired' | 'notfound' | 'ready' | 'error';
type AccessType = 'anyone' | 'can_edit' | 'password';

interface ShareMeta {
  id: string;
  share_name: string;
  access_type: AccessType;
  allow_download: boolean;
  expires_at: string | null;
  project_id: string;
  file_id: string | null;
  folder_id: string | null;
}

interface SharedFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  mime_type: string | null;
  signedUrl: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function downloadBlob(file: SharedFile) {
  if (!file.signedUrl) return;
  try {
    const res = await fetch(file.signedUrl);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.file_name;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch { /* silent */ }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: SharedFile[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={images[index].signedUrl}
        alt={images[index].file_name}
        className="max-w-full max-h-full object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <Icon name="close" size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <Icon name="chevron_left" size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <Icon name="chevron_right" size={22} />
          </button>
        </>
      )}
    </motion.div>
  );
}

// ── Rename modal ──────────────────────────────────────────────────────────────

function RenameModal({ file, onClose, onRename }: {
  file: SharedFile;
  onClose: () => void;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState(file.file_name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onRename(file.id, name.trim());
    setSaving(false);
    onClose();
  };

  return (
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
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Rename'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ file, onClose, onDelete }: {
  file: SharedFile;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    await onDelete(file.id);
    setDeleting(false);
    onClose();
  };

  return (
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
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={confirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main SharePage ────────────────────────────────────────────────────────────

export function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [status, setStatus] = useState<ShareStatus>('loading');
  const [share, setShare] = useState<ShareMeta | null>(null);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folderName, setFolderName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<SharedFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedFile | null>(null);

  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-share?id=${shareId}`;

  const callEdgeFn = useCallback(async (passwordHash?: string) => {
    const res = await fetch(edgeFnUrl, {
      method: passwordHash ? 'POST' : 'GET',
      headers: authHeaders,
      ...(passwordHash ? { body: JSON.stringify({ password_hash: passwordHash }) } : {}),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyResponse = useCallback((data: Record<string, unknown>) => {
    if (data.status === 'ok') {
      const shareMeta = data.share as ShareMeta;
      const fileList = (data.files as SharedFile[]) ?? [];
      setShare(shareMeta);
      setProjectName((data.projectName as string) ?? '');
      setFolderName((data.folderName as string) ?? '');
      setFiles(fileList);

      // Auto-download when: single-file share + allow_download enabled
      if (shareMeta.allow_download && shareMeta.file_id && fileList.length === 1 && fileList[0].signedUrl) {
        downloadBlob(fileList[0]);
      }

      setStatus('ready');
    } else if (data.status === 'password_required') {
      setShare(data.share as ShareMeta);
      setStatus('password');
    } else if (data.error === 'expired') {
      setStatus('expired');
    } else if (data.error === 'not_found') {
      setStatus('notfound');
    } else {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!shareId) { setStatus('notfound'); return; }
    callEdgeFn().then(applyResponse).catch(() => setStatus('error'));
  }, [shareId, callEdgeFn, applyResponse]);

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) return;
    setVerifying(true);
    setPasswordError('');
    try {
      const hash = await hashPassword(passwordInput);
      const data = await callEdgeFn(hash);
      if (data.status === 'password_required') {
        setPasswordError('Incorrect password. Try again.');
      } else {
        applyResponse(data);
      }
    } catch {
      setPasswordError('Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    const { error } = await supabase.from('project_files').update({ file_name: newName }).eq('id', id);
    if (!error) setFiles((prev) => prev.map((f) => f.id === id ? { ...f, file_name: newName } : f));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_files').delete().eq('id', id);
    if (!error) setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canEdit = share?.access_type === 'can_edit';
  const images = files.filter((f) => f.file_type === 'image' && f.signedUrl);
  const others = files.filter((f) => f.file_type !== 'image');

  const accessLabel: Record<AccessType, { label: string; icon: string; cls: string }> = {
    anyone:   { label: 'View only',         icon: 'visibility', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    can_edit: { label: 'Can edit',           icon: 'edit',       cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    password: { label: 'Password protected', icon: 'lock',       cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading shared content…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto">
            <Icon name="link_off" size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Link not found</h1>
          <p className="text-gray-400 text-sm">This share link doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto">
            <Icon name="schedule" size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Link expired</h1>
          <p className="text-gray-400 text-sm">This share link is no longer active.</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <Icon name="error" size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="text-gray-400 text-sm">Unable to load this share. Please try again.</p>
          <button
            onClick={() => { setStatus('loading'); callEdgeFn().then(applyResponse).catch(() => setStatus('error')); }}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Icon name="lock" size={24} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white text-center mb-1">
              {share?.share_name || 'Protected Content'}
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
            <span className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
              <Icon name="lock" size={9} className="text-white" fill />
            </span>
            Shared via PromptVault
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const displayName = share?.share_name || folderName || projectName || 'Shared Files';
  const currentAccess = accessLabel[(share?.access_type ?? 'anyone') as AccessType];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md sticky top-0 z-20">
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
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-2">
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
          {folderName && (
            <span className="flex items-center gap-1.5">
              <Icon name="folder" size={15} className="text-amber-400" />
              {folderName}
            </span>
          )}
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
          <div className="text-center py-20">
            <Icon name="folder_open" size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No files in this share</p>
            <p className="text-gray-600 text-sm mt-1">The owner hasn't added any files yet.</p>
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
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-800 cursor-pointer"
                  onClick={() => setLightboxIdx(i)}
                >
                  <img
                    src={img.signedUrl}
                    alt={img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white/80 truncate flex-1 mr-1">{img.file_name}</p>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <>
                          <button onClick={() => setRenameTarget(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-blue-600/80 transition-colors" title="Rename">
                            <Icon name="edit" size={12} />
                          </button>
                          <button onClick={() => setDeleteTarget(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-red-600/80 transition-colors" title="Delete">
                            <Icon name="delete" size={12} />
                          </button>
                        </>
                      )}
                      {share?.allow_download && (
                        <button onClick={() => downloadBlob(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-colors" title="Download">
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

        {/* Non-image files */}
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                      <>
                        <button onClick={() => setRenameTarget(f)} className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Rename">
                          <Icon name="edit" size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(f)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Icon name="delete" size={15} />
                        </button>
                      </>
                    )}
                    {share?.allow_download && f.signedUrl && (
                      <button
                        onClick={() => downloadBlob(f)}
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
          <Lightbox
            images={images}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onPrev={() => setLightboxIdx((i) => (i! - 1 + images.length) % images.length)}
            onNext={() => setLightboxIdx((i) => (i! + 1) % images.length)}
          />
        )}
      </AnimatePresence>

      {/* Edit modals */}
      <AnimatePresence>
        {renameTarget && (
          <RenameModal
            file={renameTarget}
            onClose={() => setRenameTarget(null)}
            onRename={handleRename}
          />
        )}
        {deleteTarget && (
          <DeleteConfirm
            file={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-gray-800/40 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
            <Icon name="lock" size={9} className="text-white" fill />
          </span>
          Shared via PromptVault
        </div>
      </footer>
    </div>
  );
}
