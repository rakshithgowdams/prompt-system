import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  usePasswordVault,
  useCreateVaultEntry,
  useUpdateVaultEntry,
  useDeleteVaultEntry,
} from '../hooks/usePasswordVault';
import { decryptPassword } from '../lib/crypto';
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
    return (
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain p-1"
        onError={() => setOk(false)}
      />
    );
  }
  const letter = (platform.trim()[0] ?? '?').toUpperCase();
  const color = GRADIENT_COLORS[(letter.charCodeAt(0) ?? 0) % GRADIENT_COLORS.length];
  return (
    <div className={cn('w-full h-full rounded-xl bg-gradient-to-br flex items-center justify-center', color)}>
      <span className="text-white font-bold text-base leading-none select-none">{letter}</span>
    </div>
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
  const platformRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => platformRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const faviconSrc = getFaviconUrl(siteUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.trim()) { toast.error('Platform name is required'); return; }
    if (!username.trim()) { toast.error('Username / User ID is required'); return; }
    if (!password.trim()) { toast.error('Password is required'); return; }
    await onSubmit({
      platform: platform.trim(),
      siteUrl: siteUrl.trim(),
      username: username.trim(),
      password,
      notes: notes.trim(),
    });
  };

  const field = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Platform row with live favicon */}
      <div className="flex gap-3 items-end">
        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex-shrink-0 overflow-hidden">
          {siteUrl && faviconSrc && faviconOk ? (
            <img src={faviconSrc} alt="" className="w-full h-full object-contain p-1" onError={() => setFaviconOk(false)} />
          ) : platform ? (
            <div className={cn(
              'w-full h-full rounded-xl bg-gradient-to-br flex items-center justify-center',
              GRADIENT_COLORS[(platform.charCodeAt(0) ?? 0) % GRADIENT_COLORS.length],
            )}>
              <span className="text-white font-bold text-lg select-none">{platform[0]?.toUpperCase()}</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="language" size={22} className="text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-400 block mb-1.5">
            Platform Name <span className="text-red-400">*</span>
          </label>
          <input
            ref={platformRef}
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. GitHub, Gmail, Twitter…"
            className={field}
          />
        </div>
      </div>

      {/* Website URL */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Website URL <span className="text-gray-600 font-normal">(for favicon)</span>
        </label>
        <input
          type="text"
          value={siteUrl}
          onChange={(e) => { setSiteUrl(e.target.value); setFaviconOk(true); }}
          placeholder="e.g. github.com"
          className={field}
        />
      </div>

      {/* Username */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Username / Email <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your@email.com or @handle"
          className={field}
          autoComplete="off"
        />
      </div>

      {/* Password */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password…"
            className={cn(field, 'pr-10')}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
          <Icon name="lock" size={11} />
          Encrypted with AES-256-GCM before saving
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Notes <span className="text-gray-600 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Recovery email, 2FA backup codes, etc."
          className={cn(field, 'resize-none')}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={submitting}>
          <Icon name="save" size={15} />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ── Vault card ────────────────────────────────────────────────────────────────
function VaultCard({
  entry,
  onEdit,
  onDelete,
  userId,
}: {
  entry: PasswordVaultEntry;
  onEdit: (entry: PasswordVaultEntry) => void;
  onDelete: (entry: PasswordVaultEntry) => void;
  userId: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [copied, setCopied] = useState<'user' | 'pw' | null>(null);

  const reveal = async () => {
    if (revealed) { setRevealed(false); setPlaintext(''); return; }
    setDecrypting(true);
    try {
      const pw = await decryptPassword(entry.encrypted_data, userId);
      setPlaintext(pw);
      setRevealed(true);
    } catch {
      toast.error('Failed to decrypt password');
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700/50">
          <Favicon siteUrl={entry.site_url} platform={entry.platform} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: name + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm truncate">{entry.platform}</p>
              {entry.site_url && (
                <a
                  href={entry.site_url.startsWith('http') ? entry.site_url : `https://${entry.site_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-blue-400 transition-colors truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {entry.site_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Edit / Delete — always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(entry)}
                className="p-2 rounded-xl text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                title="Edit"
              >
                <Icon name="edit" size={15} />
              </button>
              <button
                onClick={() => onDelete(entry)}
                className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete"
              >
                <Icon name="delete" size={15} />
              </button>
            </div>
          </div>

          {/* Username row */}
          <div className="mt-2.5 flex items-center gap-2 min-w-0">
            <Icon name="person" size={13} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-300 truncate flex-1 min-w-0">{entry.username}</span>
            <button
              onClick={() => copyText(entry.username, 'user')}
              className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              title="Copy username"
            >
              <Icon
                name={copied === 'user' ? 'check' : 'content_copy'}
                size={13}
                className={copied === 'user' ? 'text-emerald-400' : ''}
              />
            </button>
          </div>

          {/* Password row */}
          <div className="mt-1.5 flex items-center gap-2 min-w-0">
            <Icon name="key" size={13} className="text-gray-500 flex-shrink-0" />
            <span className={cn('text-xs flex-1 truncate min-w-0 font-mono', revealed ? 'text-gray-200' : 'text-gray-500 tracking-widest')}>
              {revealed ? plaintext : '••••••••••'}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AnimatePresence>
                {revealed && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => copyText(plaintext, 'pw')}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                    title="Copy password"
                  >
                    <Icon
                      name={copied === 'pw' ? 'check' : 'content_copy'}
                      size={13}
                      className={copied === 'pw' ? 'text-emerald-400' : ''}
                    />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                onClick={reveal}
                disabled={decrypting}
                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                title={revealed ? 'Hide password' : 'Reveal password'}
              >
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

          {/* Notes */}
          {entry.notes && (
            <p className="mt-2 text-xs text-gray-500 italic line-clamp-1">{entry.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function PasswordVaultPage() {
  const { user } = useAuth();
  const { data: entries = [], isLoading } = usePasswordVault();
  const createEntry = useCreateVaultEntry();
  const updateEntry = useUpdateVaultEntry();
  const deleteEntry = useDeleteVaultEntry();

  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordVaultEntry | null>(null);
  const [editDecryptedPw, setEditDecryptedPw] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PasswordVaultEntry | null>(null);
  const [search, setSearch] = useState('');

  const openEdit = async (entry: PasswordVaultEntry) => {
    try {
      const pw = await decryptPassword(entry.encrypted_data, user!.id);
      setEditDecryptedPw(pw);
      setEditEntry(entry);
    } catch {
      toast.error('Could not decrypt entry');
    }
  };

  const handleCreate = async (v: FormValues) => {
    try {
      await createEntry.mutateAsync(v);
      toast.success('Password saved');
      setAddOpen(false);
    } catch {
      toast.error('Failed to save password');
    }
  };

  const handleUpdate = async (v: FormValues) => {
    try {
      await updateEntry.mutateAsync({ id: editEntry!.id, ...v });
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
    return (
      e.platform.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.site_url.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <Icon name="shield" size={18} className="text-blue-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Password Vault
              </h1>
            </div>

            {/* Add button — visible on sm+ in header */}
            <div className="hidden sm:block flex-shrink-0">
              <Button onClick={() => setAddOpen(true)} size="sm">
                <Icon name="add" size={15} />
                Add Password
              </Button>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-400 mt-2 ml-12 sm:ml-0">
            Passwords are encrypted with AES-256-GCM — only you can decrypt them.
          </p>

          {/* Add button — mobile only, below subtitle */}
          <div className="sm:hidden mt-4">
            <Button onClick={() => setAddOpen(true)} className="w-full">
              <Icon name="add" size={15} />
              Add Password
            </Button>
          </div>
        </motion.div>

        {/* ── Encryption notice ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="flex items-start gap-3 px-3.5 py-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl mb-5"
        >
          <Icon name="verified_user" size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300 leading-relaxed">
            All passwords are encrypted on your device before being stored. The server only ever sees ciphertext — your plaintext passwords never leave this browser.
          </p>
        </motion.div>

        {/* ── Search ─────────────────────────────────────────────────── */}
        {entries.length > 3 && (
          <div className="relative mb-5">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search platforms, usernames…"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
        )}

        {/* ── Entries ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[88px] bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14 sm:py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center mx-auto mb-4">
              <Icon name="lock" size={26} className="text-gray-500" />
            </div>
            <p className="text-gray-300 font-medium mb-1">
              {search ? 'No matching entries' : 'Your vault is empty'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
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
                  userId={user!.id}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Entry count */}
        {filtered.length > 0 && (
          <p className="text-xs text-gray-600 text-center mt-6">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} stored
          </p>
        )}
      </div>

      {/* ── Add modal ───────────────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Password">
        <EntryForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          submitting={createEntry.isPending}
          submitLabel="Save Password"
        />
      </Modal>

      {/* ── Edit modal ──────────────────────────────────────────────────── */}
      <Modal
        open={!!editEntry}
        onClose={() => { setEditEntry(null); setEditDecryptedPw(''); }}
        title="Edit Password"
      >
        {editEntry && (
          <EntryForm
            initial={{
              platform: editEntry.platform,
              siteUrl: editEntry.site_url,
              username: editEntry.username,
              password: editDecryptedPw,
              notes: editEntry.notes,
            }}
            onSubmit={handleUpdate}
            onCancel={() => { setEditEntry(null); setEditDecryptedPw(''); }}
            submitting={updateEntry.isPending}
            submitLabel="Update Password"
          />
        )}
      </Modal>

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message={`Remove "${deleteTarget?.platform}" from your vault? This cannot be undone.`}
        loading={deleteEntry.isPending}
      />
    </>
  );
}

