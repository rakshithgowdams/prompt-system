import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { formatFileSize } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
    case 'image':    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'video':    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'audio':    return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
    case 'document': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    default:         return 'text-gray-400 bg-gray-700/50 border-gray-600/30';
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

// ── Inline Auth Modal ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min. 6 characters'),
});
const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min. 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

function AuthModal({
  open,
  onClose,
  onSuccess,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reason: 'download' | 'edit';
}) {
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const handleLogin = async (data: LoginForm) => {
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) { toast.error(error.message); return; }
    toast.success('Signed in!');
    onSuccess();
  };

  const handleSignup = async (data: SignupForm) => {
    const { error } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (error) { toast.error(error.message); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (loginError) { toast.error('Account created — please sign in.'); setTab('login'); return; }
    toast.success('Account created!');
    onSuccess();
  };

  const reasonText = reason === 'download'
    ? 'Sign in or create a free account to download files.'
    : 'Sign in or create a free account to edit files.';

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-5 border-b border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Icon name="lock" size={13} className="text-white" fill />
                </div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">PromptVault</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {tab === 'login' ? 'Sign in to continue' : 'Create a free account'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">{reasonText}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors flex-shrink-0 mt-0.5">
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex mt-4 bg-gray-800 rounded-xl p-1 gap-1">
            {(['signup', 'login'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  tab === t ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200',
                )}
              >
                {t === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>
        </div>

        {/* Forms */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="space-y-4"
              >
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={loginForm.formState.errors.email?.message}
                  autoComplete="email"
                  {...loginForm.register('email')}
                />
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={loginForm.formState.errors.password?.message}
                    autoComplete="current-password"
                    className="pr-11"
                    {...loginForm.register('password')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 bottom-0 h-11 text-gray-400 hover:text-gray-200">
                    <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
                  </button>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full" size="lg" loading={loginForm.formState.isSubmitting}>
                  Sign In
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.15 }}
                onSubmit={signupForm.handleSubmit(handleSignup)}
                className="space-y-4"
              >
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={signupForm.formState.errors.email?.message}
                  autoComplete="email"
                  {...signupForm.register('email')}
                />
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    error={signupForm.formState.errors.password?.message}
                    autoComplete="new-password"
                    className="pr-11"
                    {...signupForm.register('password')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 bottom-0 h-11 text-gray-400 hover:text-gray-200">
                    <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
                  </button>
                </div>
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Repeat your password"
                  error={signupForm.formState.errors.confirm?.message}
                  autoComplete="new-password"
                  {...signupForm.register('confirm')}
                />
                <Button type="submit" className="w-full" size="lg" loading={signupForm.formState.isSubmitting}>
                  Create Free Account
                </Button>
                <p className="text-center text-xs text-gray-500">
                  Free forever. No credit card required.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
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

  const img = images[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.img
        key={img.id}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        src={img.signedUrl}
        alt={img.file_name}
        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <span className="text-sm text-white/70 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 pointer-events-none">
          {img.file_name}
        </span>
        <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors pointer-events-auto">
          <Icon name="close" size={18} />
        </button>
      </div>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Icon name="chevron_left" size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Icon name="chevron_right" size={22} />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); onClose(); }} className={cn('w-1.5 h-1.5 rounded-full transition-all', i === index ? 'bg-white scale-125' : 'bg-white/40')} />
            ))}
          </div>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white mb-4">Rename File</h3>
        <input autoFocus type="text" value={name}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
          <Icon name="delete" size={18} className="text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Delete file?</h3>
        <p className="text-sm text-gray-400 mb-5">"<span className="text-gray-200">{file.file_name}</span>" will be permanently removed.</p>
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
  const { user } = useAuth();

  const [status, setStatus] = useState<ShareStatus>('loading');
  const [share, setShare] = useState<ShareMeta | null>(null);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folderName, setFolderName] = useState('');
  const [projectName, setProjectName] = useState('');

  // Password gate
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // UI state
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<SharedFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedFile | null>(null);

  // Auth gate modal
  const [authReason, setAuthReason] = useState<'download' | 'edit'>('download');
  const [authOpen, setAuthOpen] = useState(false);
  // Queued action to run after successful auth
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  // Require auth before running an action
  const requireAuth = (reason: 'download' | 'edit', action: () => void) => {
    if (user) {
      action();
    } else {
      setAuthReason(reason);
      setPendingAction(() => action);
      setAuthOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleDownload = (file: SharedFile) => {
    requireAuth('download', () => downloadBlob(file));
  };

  const handleDownloadAll = () => {
    requireAuth('download', () => {
      files.forEach((f) => { if (f.signedUrl) downloadBlob(f); });
    });
  };

  const handleRename = async (id: string, newName: string) => {
    const { error } = await supabase.from('project_files').update({ file_name: newName }).eq('id', id);
    if (!error) setFiles((prev) => prev.map((f) => f.id === id ? { ...f, file_name: newName } : f));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('project_files').delete().eq('id', id);
    if (!error) setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const triggerRename = (file: SharedFile) => {
    requireAuth('edit', () => setRenameTarget(file));
  };

  const triggerDelete = (file: SharedFile) => {
    requireAuth('edit', () => setDeleteTarget(file));
  };

  const canEdit = share?.access_type === 'can_edit';
  const images = files.filter((f) => f.file_type === 'image' && f.signedUrl);
  const others = files.filter((f) => f.file_type !== 'image');

  const accessConfig: Record<AccessType, { label: string; icon: string; cls: string }> = {
    anyone:   { label: 'View only',         icon: 'visibility', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    can_edit: { label: 'Can edit',           icon: 'edit',       cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    password: { label: 'Password protected', icon: 'lock',       cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-gray-800 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-400 text-sm">Loading shared content…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto">
            <Icon name="link_off" size={28} className="text-gray-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Link not found</h1>
            <p className="text-gray-400 text-sm mt-1">This share link doesn't exist or has been removed.</p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-600 mb-3">Want to share your own files?</p>
            <a href="/signup" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Icon name="lock" size={14} fill />
              Join PromptVault — it's free
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto">
            <Icon name="schedule" size={28} className="text-gray-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Link expired</h1>
            <p className="text-gray-400 text-sm mt-1">The owner of this link set an expiry date and it has passed.</p>
          </div>
          <div className="pt-2">
            <a href="/signup" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Icon name="lock" size={14} fill />
              Join PromptVault — it's free
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Icon name="error" size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="text-gray-400 text-sm">Unable to load this share. Please try again.</p>
          <button onClick={() => { setStatus('loading'); callEdgeFn().then(applyResponse).catch(() => setStatus('error')); }} className="text-sm text-blue-400 hover:text-blue-300 underline">
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
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600" />
            <div className="p-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="lock" size={26} className="text-amber-400" />
              </div>
              <h1 className="text-xl font-bold text-white text-center mb-1">
                {share?.share_name || 'Protected Content'}
              </h1>
              <p className="text-sm text-gray-400 text-center mb-6">Enter the password to view this content</p>

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
                      'w-full bg-gray-800 border rounded-xl px-4 py-3 pr-11 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors',
                      passwordError ? 'border-red-500/50' : 'border-gray-700',
                    )}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors">
                    <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
                  </button>
                </div>
                <AnimatePresence>
                  {passwordError && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
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
          </div>

          {/* Join CTA under password card */}
          <div className="mt-4 p-4 bg-gray-900/60 border border-gray-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">New to PromptVault?</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage and share your AI prompts for free</p>
            </div>
            <a href="/signup" className="flex-shrink-0 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/60 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              Sign up free
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const displayName = share?.share_name || folderName || projectName || 'Shared Files';
  const currentAccess = accessConfig[(share?.access_type ?? 'anyone') as AccessType];
  const isGuest = !user;

  return (
    <div className="min-h-screen bg-gray-950 pb-28">

      {/* ── Top header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800/60 bg-gray-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: brand + share name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
              <Icon name="lock" size={15} className="text-white" fill />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
              {projectName && <p className="text-xs text-gray-500 truncate leading-tight">from {projectName}</p>}
            </div>
          </div>

          {/* Right: access badge + auth button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', currentAccess.cls)}>
              <Icon name={currentAccess.icon} size={12} />
              {currentAccess.label}
            </span>
            {isGuest && (
              <button
                onClick={() => { setAuthReason('download'); setAuthOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Icon name="person" size={13} />
                <span className="hidden sm:inline">Sign in</span>
                <span className="sm:hidden">Sign in</span>
              </button>
            )}
            {!isGuest && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {user.email?.[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline truncate max-w-[120px]">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Edit-mode banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {canEdit && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-blue-600/10 border-b border-blue-500/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon name="edit" size={14} className="text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-300 font-medium">
                  {isGuest
                    ? 'You have edit access on this share — sign in to rename or delete files.'
                    : 'You have edit access — you can rename and delete files in this share.'}
                </p>
              </div>
              {isGuest && (
                <button onClick={() => { setAuthReason('edit'); setAuthOpen(true); }} className="flex-shrink-0 text-xs font-medium text-blue-400 border border-blue-500/30 hover:border-blue-400/60 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Icon name="folder_open" size={15} />
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          {folderName && (
            <span className="flex items-center gap-1.5 text-amber-400/80">
              <Icon name="folder" size={15} />
              {folderName}
            </span>
          )}
          <span className={cn('flex items-center gap-1.5 sm:hidden', currentAccess.cls.split(' ')[0])}>
            <Icon name={currentAccess.icon} size={13} />
            {currentAccess.label}
          </span>
          {share?.allow_download ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Icon name="download" size={14} />
              Downloads enabled
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-600">
              <Icon name="download_off" size={14} />
              View only
            </span>
          )}
        </div>

        {/* Empty state */}
        {files.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
              <Icon name="folder_open" size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No files in this share</p>
            <p className="text-gray-600 text-sm mt-1">The owner hasn't added any files yet.</p>
          </div>
        )}

        {/* ── Image gallery ──────────────────────────────────────────────────── */}
        {images.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Icon name="photo_library" size={15} />
                Images
                <span className="text-xs font-normal text-gray-500">({images.length})</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-800 border border-gray-700/50 cursor-pointer"
                  onClick={() => setLightboxIdx(i)}
                >
                  <img
                    src={img.signedUrl}
                    alt={img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 inset-x-0 p-2.5 flex items-end justify-between">
                      <p className="text-[10px] text-white/80 truncate flex-1 mr-1">{img.file_name}</p>
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <>
                            <button onClick={() => triggerRename(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-blue-600/80 transition-colors" title="Rename">
                              <Icon name="edit" size={12} />
                            </button>
                            <button onClick={() => triggerDelete(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-red-600/80 transition-colors" title="Delete">
                              <Icon name="delete" size={12} />
                            </button>
                          </>
                        )}
                        {share?.allow_download && (
                          <button onClick={() => handleDownload(img)} className="w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-colors" title="Download">
                            <Icon name="download" size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Other files ────────────────────────────────────────────────────── */}
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
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', fileColor(f.file_type))}>
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
                        <button onClick={() => triggerRename(f)} className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Rename">
                          <Icon name="edit" size={15} />
                        </button>
                        <button onClick={() => triggerDelete(f)} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Icon name="delete" size={15} />
                        </button>
                      </>
                    )}
                    {share?.allow_download && f.signedUrl && (
                      <button onClick={() => handleDownload(f)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
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

      {/* ── Sticky bottom bar ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-20">
        {/* Download bar (shown when downloads are allowed) */}
        {share?.allow_download && files.length > 0 && (
          <div className="bg-gray-900/95 border-t border-gray-800 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="download" size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate">
                  {files.length} file{files.length !== 1 ? 's' : ''} available to download
                </span>
              </div>
              <button
                onClick={handleDownloadAll}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
              >
                <Icon name="download" size={15} />
                {isGuest ? 'Download All' : 'Download All'}
              </button>
            </div>
          </div>
        )}

        {/* Join CTA bar for guests */}
        {isGuest && (
          <div className="bg-gradient-to-r from-blue-600/95 to-blue-700/95 border-t border-blue-500/30 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="lock" size={15} className="text-white" fill />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">Manage your own AI prompts</p>
                  <p className="text-xs text-blue-200/80 truncate leading-tight hidden sm:block">Share files, write notes, and organise projects — for free</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href="/login" className="text-xs font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap">
                  Sign in
                </a>
                <a href="/signup" className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm">
                  Create free account
                  <Icon name="arrow_forward" size={13} />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
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

      {/* ── Edit modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {renameTarget && (
          <RenameModal file={renameTarget} onClose={() => setRenameTarget(null)} onRename={handleRename} />
        )}
        {deleteTarget && (
          <DeleteConfirm file={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={handleDelete} />
        )}
      </AnimatePresence>

      {/* ── Auth gate modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {authOpen && (
          <AuthModal
            open={authOpen}
            onClose={() => { setAuthOpen(false); setPendingAction(null); }}
            onSuccess={handleAuthSuccess}
            reason={authReason}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
