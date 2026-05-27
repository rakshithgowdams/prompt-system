import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  usePasswordVault,
  useVaultMeta,
  useSetupVault,
  useCreateVaultEntry,
  useUpdateVaultEntry,
  useDeleteVaultEntry,
} from '../hooks/usePasswordVault';
import { decryptPassword, verifyMasterPassword } from '../lib/crypto';
import { useVault } from '../contexts/VaultContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/utils';
import type { PasswordVaultEntry } from '../lib/database.types';

type FormValues = {
  platform: string;
  siteUrl: string;
  username: string;
  password: string;
  notes: string;
};

// ── Favicon ───────────────────────────────────────────────────────────────────
function getFaviconUrl(siteUrl: string): string | null {
  if (!siteUrl.trim()) return null;
  try {
    const url = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

const GRADIENT_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
  'from-sky-500 to-sky-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
];

function Favicon({ siteUrl, platform }: { siteUrl: string; platform: string }) {
  const [ok, setOk] = useState(true);
  const src = getFaviconUrl(siteUrl);
  if (src && ok) {
    return <img src={src} alt="" className="w-full h-full object-contain p-1" onError={() => setOk(false)} />;
  }
  const letter = (platform.trim()[0] ?? '?').toUpperCase();
  const color = GRADIENT_COLORS[(letter.charCodeAt(0) ?? 0) % GRADIENT_COLORS.length];
  return (
    <div className={cn('w-full h-full rounded-md bg-gradient-to-br flex items-center justify-center', color)}>
      <span className="text-white font-bold text-base leading-none select-none">{letter}</span>
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────────────
function strengthScore(pw: string): number {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = strengthScore(password);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < score ? colors[score] : 'bg-ink-200')} />
        ))}
      </div>
      <p className={cn('text-[11px]', score >= 4 ? 'text-green-600' : score >= 2 ? 'text-amber-600' : 'text-red-500')}>
        {labels[score]}
      </p>
    </div>
  );
}

// ── Setup screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onDone }: { onDone: (mp: string) => void }) {
  const setupVault = useSetupVault();
  const [mp, setMp] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showMp, setShowMp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mp.length < 8) { toast.error('Master password must be at least 8 characters'); return; }
    if (mp !== confirm) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await setupVault.mutateAsync(mp);
      toast.success('Vault set up! Your master password is never stored.');
      onDone(mp);
    } catch {
      toast.error('Failed to set up vault');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
          <Icon name="lock" size={28} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight mb-2">Set Up Your Vault</h1>
        <p className="text-sm text-ink-500 text-center max-w-xs">
          Choose a master password to protect your vault. It is never stored — if you forget it, your encrypted entries cannot be recovered.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md px-3.5 py-3 mb-6 flex items-start gap-2.5">
        <Icon name="warning" size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Write it down somewhere safe.</strong> There is no recovery option — this is what makes the vault secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-700 block mb-1.5">Master Password</label>
          <div className="relative">
            <input
              type={showMp ? 'text' : 'password'}
              value={mp}
              onChange={(e) => setMp(e.target.value)}
              placeholder="At least 8 characters…"
              className={cn(field, 'pr-10')}
              autoComplete="new-password"
              autoFocus
            />
            <button type="button" onClick={() => setShowMp(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors">
              <Icon name={showMp ? 'visibility_off' : 'visibility'} size={17} />
            </button>
          </div>
          <StrengthBar password={mp} />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-700 block mb-1.5">Confirm Master Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter master password…"
            className={field}
            autoComplete="new-password"
          />
          {confirm && mp !== confirm && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={submitting} disabled={mp.length < 8 || mp !== confirm}>
          <Icon name="lock" size={15} />
          Create Vault
        </Button>
      </form>
    </motion.div>
  );
}

// ── Unlock screen ─────────────────────────────────────────────────────────────
function UnlockScreen({ saltB64, verifier, onUnlocked }: {
  saltB64: string;
  verifier: string;
  onUnlocked: (mp: string) => void;
}) {
  const [mp, setMp] = useState('');
  const [showMp, setShowMp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mp) return;
    setSubmitting(true);
    setFailed(false);
    try {
      const ok = await verifyMasterPassword(mp, saltB64, verifier);
      if (ok) {
        onUnlocked(mp);
      } else {
        setFailed(true);
        toast.error('Incorrect master password');
      }
    } catch {
      setFailed(true);
      toast.error('Failed to verify password');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-ink-100 border border-ink-300 flex items-center justify-center mb-4">
          <Icon name="lock" size={28} className="text-ink-500" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ink-900 tracking-tight mb-2">Vault Locked</h1>
        <p className="text-sm text-ink-500 text-center max-w-xs">
          Enter your master password to access your stored passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-700 block mb-1.5">Master Password</label>
          <div className="relative">
            <input
              type={showMp ? 'text' : 'password'}
              value={mp}
              onChange={(e) => { setMp(e.target.value); setFailed(false); }}
              placeholder="Enter master password…"
              className={cn(field, 'pr-10', failed && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
              autoComplete="current-password"
              autoFocus
            />
            <button type="button" onClick={() => setShowMp(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors">
              <Icon name={showMp ? 'visibility_off' : 'visibility'} size={17} />
            </button>
          </div>
          {failed && <p className="text-xs text-red-500 mt-1">Incorrect master password. Try again.</p>}
        </div>

        <Button type="submit" className="w-full" loading={submitting} disabled={!mp}>
          <Icon name="lock_open" size={15} />
          Unlock Vault
        </Button>
      </form>
    </motion.div>
  );
}

// ── Entry form ────────────────────────────────────────────────────────────────
interface EntryFormProps {
  initial?: Partial<FormValues>;
  onSubmit: (v: FormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}

function EntryForm({ initial, onSubmit, onCancel, submitting, submitLabel }: EntryFormProps) {
  const [platform, setPlatform] = useState(initial?.platform ?? '');
  const [siteUrl, setSiteUrl] = useState(initial?.siteUrl ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showPw, setShowPw] = useState(false);
  const [faviconOk, setFaviconOk] = useState(true);

  const faviconSrc = getFaviconUrl(siteUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.trim()) { toast.error('Platform name is required'); return; }
    if (!username.trim()) { toast.error('Username / User ID is required'); return; }
    if (!password.trim()) { toast.error('Password is required'); return; }
    await onSubmit({ platform: platform.trim(), siteUrl: siteUrl.trim(), username: username.trim(), password, notes: notes.trim() });
  };

  const field = 'w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="w-12 h-12 rounded-md bg-ink-100 border border-ink-300 flex-shrink-0 overflow-hidden">
          {siteUrl && faviconSrc && faviconOk ? (
            <img src={faviconSrc} alt="" className="w-full h-full object-contain p-1" onError={() => setFaviconOk(false)} />
          ) : platform ? (
            <div className={cn('w-full h-full rounded-md bg-gradient-to-br flex items-center justify-center',
              GRADIENT_COLORS[(platform.charCodeAt(0) ?? 0) % GRADIENT_COLORS.length])}>
              <span className="text-white font-bold text-lg select-none">{platform[0]?.toUpperCase()}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="language" size={22} className="text-ink-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-ink-700 block mb-1.5">Platform Name <span className="text-danger">*</span></label>
          <input autoFocus type="text" value={platform} onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. GitHub, Gmail, Twitter…" className={field} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1.5">Website URL <span className="text-ink-400 font-normal">(for favicon)</span></label>
        <input type="text" value={siteUrl} onChange={(e) => { setSiteUrl(e.target.value); setFaviconOk(true); }}
          placeholder="e.g. github.com" className={field} />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1.5">Username / Email <span className="text-danger">*</span></label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="your@email.com or @handle" className={field} autoComplete="off" />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1.5">Password <span className="text-danger">*</span></label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password…" className={cn(field, 'pr-10')} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors">
            <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
          </button>
        </div>
        <p className="text-xs text-ink-400 mt-1.5 flex items-center gap-1">
          <Icon name="lock" size={11} />
          Encrypted with AES-256-GCM before saving
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-ink-700 block mb-1.5">Notes <span className="text-ink-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Recovery email, 2FA backup codes, etc." className={cn(field, 'resize-none')} />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={submitting}>
          <Icon name="save" size={15} />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ── Vault card ────────────────────────────────────────────────────────────────
function VaultCard({ entry, onEdit, onDelete, masterPassword, saltB64 }: {
  entry: PasswordVaultEntry;
  onEdit: (entry: PasswordVaultEntry) => void;
  onDelete: (entry: PasswordVaultEntry) => void;
  masterPassword: string;
  saltB64: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [copied, setCopied] = useState<'user' | 'pw' | null>(null);

  const reveal = async () => {
    if (revealed) { setRevealed(false); setPlaintext(''); return; }
    setDecrypting(true);
    try {
      const pw = await decryptPassword(entry.encrypted_data, masterPassword, saltB64);
      setPlaintext(pw);
      setRevealed(true);
    } catch {
      toast.error('Failed to decrypt — wrong master password?');
    } finally {
      setDecrypting(false);
    }
  };

  const copyText = async (text: string, type: 'user' | 'pw') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === 'user' ? 'Username copied' : 'Password copied');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="group bg-white border border-ink-300 hover:border-ink-500 rounded-lg p-4 transition-all duration-200 hover:shadow-card">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0 bg-ink-100 border border-ink-300">
          <Favicon siteUrl={entry.site_url} platform={entry.platform} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900 text-sm truncate">{entry.platform}</p>
              {entry.site_url && (
                <a href={entry.site_url.startsWith('http') ? entry.site_url : `https://${entry.site_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-ink-500 hover:text-brand-400 transition-colors truncate block"
                  onClick={(e) => e.stopPropagation()}>
                  {entry.site_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(entry)}
                className="p-2 rounded-md text-ink-500 hover:text-brand-400 hover:bg-brand-50 transition-colors" title="Edit">
                <Icon name="edit" size={15} />
              </button>
              <button onClick={() => onDelete(entry)}
                className="p-2 rounded-md text-ink-500 hover:text-danger hover:bg-red-50 transition-colors" title="Delete">
                <Icon name="delete" size={15} />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-2 min-w-0">
            <Icon name="person" size={13} className="text-ink-500 flex-shrink-0" />
            <span className="text-xs text-ink-700 truncate flex-1 min-w-0">{entry.username}</span>
            <button onClick={() => copyText(entry.username, 'user')}
              className="flex-shrink-0 p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors" title="Copy username">
              <Icon name={copied === 'user' ? 'check' : 'content_copy'} size={13} className={copied === 'user' ? 'text-success' : ''} />
            </button>
          </div>

          <div className="mt-1.5 flex items-center gap-2 min-w-0">
            <Icon name="key" size={13} className="text-ink-500 flex-shrink-0" />
            <span className={cn('text-xs flex-1 truncate min-w-0 font-mono', revealed ? 'text-ink-900' : 'text-ink-300 tracking-widest')}>
              {revealed ? plaintext : '••••••••••'}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AnimatePresence>
                {revealed && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => copyText(plaintext, 'pw')}
                    className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors" title="Copy password">
                    <Icon name={copied === 'pw' ? 'check' : 'content_copy'} size={13} className={copied === 'pw' ? 'text-success' : ''} />
                  </motion.button>
                )}
              </AnimatePresence>
              <button onClick={reveal} disabled={decrypting}
                className="p-1.5 rounded-lg text-ink-400 hover:text-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50"
                title={revealed ? 'Hide password' : 'Reveal password'}>
                {decrypting ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Icon name={revealed ? 'visibility_off' : 'visibility'} size={14} />
                )}
              </button>
            </div>
          </div>

          {entry.notes && <p className="mt-2 text-xs text-ink-400 italic line-clamp-1">{entry.notes}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function PasswordVaultPage() {
  const { user } = useAuth();
  const { masterPassword, setMasterPassword, isUnlocked, lockVault } = useVault();
  const { data: meta, isLoading: metaLoading } = useVaultMeta();
  const { data: entries = [], isLoading: entriesLoading } = usePasswordVault();
  const createEntry = useCreateVaultEntry();
  const updateEntry = useUpdateVaultEntry();
  const deleteEntry = useDeleteVaultEntry();

  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordVaultEntry | null>(null);
  const [editDecryptedPw, setEditDecryptedPw] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PasswordVaultEntry | null>(null);
  const [search, setSearch] = useState('');

  const saltB64 = meta?.vault_salt ?? '';

  const openEdit = async (entry: PasswordVaultEntry) => {
    if (!masterPassword || !saltB64) return;
    try {
      const pw = await decryptPassword(entry.encrypted_data, masterPassword, saltB64);
      setEditDecryptedPw(pw);
      setEditEntry(entry);
    } catch {
      toast.error('Could not decrypt entry');
    }
  };

  const handleCreate = async (v: FormValues) => {
    if (!masterPassword || !saltB64) return;
    try {
      await createEntry.mutateAsync({ ...v, masterPassword, saltB64 });
      toast.success('Password saved');
      setAddOpen(false);
    } catch {
      toast.error('Failed to save password');
    }
  };

  const handleUpdate = async (v: FormValues) => {
    if (!masterPassword || !saltB64 || !editEntry) return;
    try {
      await updateEntry.mutateAsync({ id: editEntry.id, ...v, masterPassword, saltB64 });
      toast.success('Password updated');
      setEditEntry(null);
      setEditDecryptedPw('');
    } catch {
      toast.error('Failed to update password');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEntry.mutateAsync(deleteTarget.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return e.platform.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.site_url.toLowerCase().includes(q);
  });

  // Loading state
  if (metaLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading vault…</span>
        </div>
      </div>
    );
  }

  // State 1: No vault yet — first-time setup
  if (!meta?.vault_salt) {
    return <SetupScreen onDone={(mp) => setMasterPassword(mp)} />;
  }

  // State 2: Vault exists but locked this session
  if (!isUnlocked) {
    return (
      <UnlockScreen
        saltB64={meta.vault_salt}
        verifier={meta.vault_verifier ?? ''}
        onUnlocked={(mp) => setMasterPassword(mp)}
      />
    );
  }

  // State 3: Unlocked — show vault
  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <Icon name="shield" size={18} className="text-brand-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink-900 tracking-tight leading-tight">
                Password Vault
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={lockVault}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-600 border border-ink-300 hover:bg-ink-100 transition-colors">
                <Icon name="lock" size={13} />
                Lock
              </button>
              <div className="hidden sm:block">
                <Button onClick={() => setAddOpen(true)} size="sm">
                  <Icon name="add" size={15} />
                  Add Password
                </Button>
              </div>
            </div>
          </div>
          <p className="text-sm text-ink-500 mt-2 ml-12 sm:ml-0">
            Encrypted with AES-256-GCM — only your master password can decrypt.
          </p>
          <div className="sm:hidden mt-4">
            <Button onClick={() => setAddOpen(true)} className="w-full">
              <Icon name="add" size={15} />
              Add Password
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
          className="flex items-start gap-3 px-3.5 py-3 bg-green-50 border border-green-200 rounded-md mb-5">
          <Icon name="verified_user" size={15} className="text-success flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700 leading-relaxed">
            All passwords are encrypted on your device using your master password before being stored. The server only ever sees ciphertext.
          </p>
        </motion.div>

        {entries.length > 3 && (
          <div className="relative mb-5">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search platforms, usernames…"
              className="w-full bg-white border border-ink-300 rounded-md pl-10 pr-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors">
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
        )}

        {entriesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[88px] bg-ink-100 border border-ink-300 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14 sm:py-20">
            <div className="w-16 h-16 rounded-lg bg-ink-100 border border-ink-300 flex items-center justify-center mx-auto mb-4">
              <Icon name="lock" size={26} className="text-ink-400" />
            </div>
            <p className="text-ink-900 font-medium mb-1">{search ? 'No matching entries' : 'Your vault is empty'}</p>
            <p className="text-sm text-ink-500 mb-6">
              {search ? 'Try a different search term.' : 'Add your first saved password to get started.'}
            </p>
            {!search && (
              <Button onClick={() => setAddOpen(true)}>
                <Icon name="add" size={15} />
                Add First Entry
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((entry) => (
                <VaultCard
                  key={entry.id}
                  entry={entry}
                  masterPassword={masterPassword!}
                  saltB64={saltB64}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-ink-400 text-center mt-6">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} stored
          </p>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Password">
        <EntryForm onSubmit={handleCreate} onCancel={() => setAddOpen(false)}
          submitting={createEntry.isPending} submitLabel="Save Password" />
      </Modal>

      <Modal open={!!editEntry} onClose={() => { setEditEntry(null); setEditDecryptedPw(''); }} title="Edit Password">
        {editEntry && (
          <EntryForm
            initial={{ platform: editEntry.platform, siteUrl: editEntry.site_url, username: editEntry.username, password: editDecryptedPw, notes: editEntry.notes }}
            onSubmit={handleUpdate} onCancel={() => { setEditEntry(null); setEditDecryptedPw(''); }}
            submitting={updateEntry.isPending} submitLabel="Update Password"
          />
        )}
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Entry" message={`Remove "${deleteTarget?.platform}" from your vault? This cannot be undone.`}
        loading={deleteEntry.isPending} />
    </>
  );
}
