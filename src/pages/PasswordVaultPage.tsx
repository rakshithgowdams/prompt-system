import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  usePasswordVault,
  useCreateVaultEntry,
  useUpdateVaultEntry,
  useDeleteVaultEntry,
  type VaultEntry,
  type SaveParams,
} from '../hooks/usePasswordVault';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/utils';

// ── Favicon helpers ───────────────────────────────────────────────────────────

function autoFaviconUrl(siteUrl: string): string {
  if (!siteUrl.trim()) return '';
  try {
    const raw = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const { hostname } = new URL(raw);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return '';
  }
}

const COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
  'from-sky-500 to-sky-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
];

function FaviconAvatar({
  faviconUrl,
  siteUrl,
  platform,
  size = 'md',
}: {
  faviconUrl?: string;
  siteUrl?: string;
  platform: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [ok, setOk] = useState(true);
  const src = faviconUrl || autoFaviconUrl(siteUrl ?? '');
  const letter = (platform.trim()[0] ?? '?').toUpperCase();
  const color = COLORS[(letter.charCodeAt(0) ?? 0) % COLORS.length];
  const dims = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  if (src && ok) {
    return (
      <div className={cn(dims, 'rounded-xl overflow-hidden flex-shrink-0 bg-white border border-ink-200 shadow-sm')}>
        <img src={src} alt="" className="w-full h-full object-contain p-1.5" onError={() => setOk(false)} />
      </div>
    );
  }
  return (
    <div className={cn(dims, 'rounded-xl flex-shrink-0 bg-gradient-to-br flex items-center justify-center shadow-sm', color)}>
      <span className={cn('text-white font-bold select-none leading-none', size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base')}>{letter}</span>
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────

function strengthScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = strengthScore(password);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const barColors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'];
  const textColor = score >= 4 ? 'text-green-600' : score >= 2 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', i < score ? barColors[score] : 'bg-ink-200')} />
        ))}
      </div>
      <p className={cn('text-[11px] font-medium', textColor)}>{labels[score]}</p>
    </div>
  );
}

// ── Entry form ────────────────────────────────────────────────────────────────

interface FormState {
  platform: string;
  siteUrl: string;
  faviconUrl: string;
  username: string;
  password: string;
  notes: string;
}

const EMPTY_FORM: FormState = { platform: '', siteUrl: '', faviconUrl: '', username: '', password: '', notes: '' };

function EntryForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  initial?: Partial<FormState>;
  onSubmit: (v: SaveParams) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [showPw, setShowPw] = useState(false);
  const [faviconOk, setFaviconOk] = useState(true);
  const faviconPreview = form.faviconUrl || (faviconOk ? autoFaviconUrl(form.siteUrl) : '');

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.platform.trim()) { toast.error('Platform name is required'); return; }
    if (!form.username.trim()) { toast.error('User ID / Username is required'); return; }
    if (!form.password.trim()) { toast.error('Password is required'); return; }
    await onSubmit({
      platform: form.platform.trim(),
      siteUrl: form.siteUrl.trim(),
      faviconUrl: form.faviconUrl.trim(),
      username: form.username.trim(),
      password: form.password,
      notes: form.notes.trim(),
    });
  };

  const field = [
    'w-full bg-ink-50 border border-ink-300 rounded-xl px-3.5 py-3 text-sm text-ink-900',
    'placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all',
  ].join(' ');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preview + Platform */}
      <div className="flex items-end gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-ink-100 border border-ink-200 flex items-center justify-center">
          {faviconPreview ? (
            <img src={faviconPreview} alt="" className="w-full h-full object-contain p-2"
              onError={() => { setFaviconOk(false); }} />
          ) : form.platform ? (
            <div className={cn('w-full h-full bg-gradient-to-br flex items-center justify-center',
              COLORS[(form.platform.charCodeAt(0) ?? 0) % COLORS.length])}>
              <span className="text-white font-bold text-xl select-none">{form.platform[0]?.toUpperCase()}</span>
            </div>
          ) : (
            <Icon name="language" size={24} className="text-ink-400" />
          )}
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-ink-600 block mb-1.5">
            Platform Name <span className="text-red-400">*</span>
          </label>
          <input autoFocus type="text" value={form.platform} onChange={set('platform')}
            placeholder="e.g. GitHub, Gmail, Netflix…" className={field} />
        </div>
      </div>

      {/* Site URL */}
      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1.5">
          Website URL <span className="text-ink-400 font-normal">(for auto-favicon)</span>
        </label>
        <input type="text" value={form.siteUrl} onChange={(e) => { set('siteUrl')(e); setFaviconOk(true); }}
          placeholder="e.g. github.com or https://gmail.com" className={field} />
      </div>

      {/* Custom favicon URL */}
      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1.5">
          Custom Favicon URL <span className="text-ink-400 font-normal">(optional — overrides auto)</span>
        </label>
        <input type="text" value={form.faviconUrl} onChange={set('faviconUrl')}
          placeholder="https://example.com/favicon.ico" className={field} />
      </div>

      {/* Username / ID */}
      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1.5">
          User ID / Username / Email <span className="text-red-400">*</span>
        </label>
        <input type="text" value={form.username} onChange={set('username')}
          placeholder="your@email.com or @handle or user ID" className={field} autoComplete="off" />
      </div>

      {/* Password */}
      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1.5">
          Password <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
            placeholder="Enter password…" className={cn(field, 'pr-10 font-mono')} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 transition-colors">
            <Icon name={showPw ? 'visibility_off' : 'visibility'} size={17} />
          </button>
        </div>
        <StrengthBar password={form.password} />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1.5">
          Notes <span className="text-ink-400 font-normal">(optional)</span>
        </label>
        <textarea value={form.notes} onChange={set('notes')} rows={2}
          placeholder="Recovery email, 2FA codes, hints…"
          className={cn(field, 'resize-none leading-relaxed')} />
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

function VaultCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  onEdit: (e: VaultEntry) => void;
  onDelete: (e: VaultEntry) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<'user' | 'pw' | null>(null);

  const copy = async (text: string, type: 'user' | 'pw') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === 'user' ? 'User ID copied' : 'Password copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const siteHref = entry.site_url
    ? entry.site_url.startsWith('http') ? entry.site_url : `https://${entry.site_url}`
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group bg-white border border-ink-200 hover:border-ink-400 rounded-2xl p-4 transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <FaviconAvatar
          faviconUrl={entry.favicon_url}
          siteUrl={entry.site_url}
          platform={entry.platform}
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-ink-900 text-sm truncate">{entry.platform}</p>
              {siteHref && (
                <a href={siteHref} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-ink-400 hover:text-brand-400 transition-colors truncate block mt-0.5"
                  onClick={(e) => e.stopPropagation()}>
                  {entry.site_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(entry)}
                className="p-1.5 rounded-lg text-ink-400 hover:text-brand-400 hover:bg-brand-50 transition-colors"
                title="Edit">
                <Icon name="edit" size={14} />
              </button>
              <button onClick={() => onDelete(entry)}
                className="p-1.5 rounded-lg text-ink-400 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Delete">
                <Icon name="delete" size={14} />
              </button>
            </div>
          </div>

          {/* Username row */}
          <div className="mt-2.5 flex items-center gap-2 bg-ink-50 rounded-lg px-2.5 py-1.5">
            <Icon name="person" size={12} className="text-ink-400 flex-shrink-0" />
            <span className="text-xs text-ink-700 truncate flex-1 min-w-0 font-medium">{entry.username}</span>
            <button onClick={() => copy(entry.username, 'user')}
              className="flex-shrink-0 p-1 rounded text-ink-400 hover:text-ink-700 transition-colors"
              title="Copy user ID">
              <Icon name={copied === 'user' ? 'check' : 'content_copy'} size={12}
                className={copied === 'user' ? 'text-green-500' : ''} />
            </button>
          </div>

          {/* Password row */}
          <div className="mt-1.5 flex items-center gap-2 bg-ink-50 rounded-lg px-2.5 py-1.5">
            <Icon name="key" size={12} className="text-ink-400 flex-shrink-0" />
            <span className={cn(
              'text-xs flex-1 truncate min-w-0',
              showPw ? 'text-ink-900 font-mono tracking-wide' : 'text-ink-300 tracking-[0.25em]'
            )}>
              {showPw ? entry.encrypted_data : '•••••••••••'}
            </span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <AnimatePresence>
                {showPw && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => copy(entry.encrypted_data, 'pw')}
                    className="p-1 rounded text-ink-400 hover:text-ink-700 transition-colors"
                    title="Copy password">
                    <Icon name={copied === 'pw' ? 'check' : 'content_copy'} size={12}
                      className={copied === 'pw' ? 'text-green-500' : ''} />
                  </motion.button>
                )}
              </AnimatePresence>
              <button onClick={() => setShowPw(v => !v)}
                className="p-1 rounded text-ink-400 hover:text-brand-400 transition-colors"
                title={showPw ? 'Hide password' : 'Show password'}>
                <Icon name={showPw ? 'visibility_off' : 'visibility'} size={13} />
              </button>
            </div>
          </div>

          {entry.notes && (
            <p className="mt-2 text-[11px] text-ink-400 italic line-clamp-1 px-1">{entry.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PasswordVaultPage() {
  const { data: entries = [], isLoading } = usePasswordVault();
  const createEntry = useCreateVaultEntry();
  const updateEntry = useUpdateVaultEntry();
  const deleteEntry = useDeleteVaultEntry();

  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<VaultEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (v: SaveParams) => {
    try {
      await createEntry.mutateAsync(v);
      toast.success('Password saved');
      setAddOpen(false);
    } catch {
      toast.error('Failed to save password');
    }
  };

  const handleUpdate = async (v: SaveParams) => {
    if (!editEntry) return;
    try {
      await updateEntry.mutateAsync({ id: editEntry.id, ...v });
      toast.success('Password updated');
      setEditEntry(null);
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <Icon name="shield" size={20} className="text-brand-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-ink-900 tracking-tight">Password Vault</h1>
                <p className="text-xs text-ink-500">
                  {isLoading ? 'Loading…' : `${entries.length} saved password${entries.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            <Button onClick={() => setAddOpen(true)} size="sm" className="flex-shrink-0">
              <Icon name="add" size={15} />
              <span className="hidden sm:inline">Add Password</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        {entries.length > 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mb-5">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search platforms, usernames…"
              className="w-full bg-white border border-ink-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors">
                <Icon name="close" size={15} />
              </button>
            )}
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[100px] bg-ink-100 border border-ink-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-24"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 flex items-center justify-center mx-auto mb-5">
              <Icon name={search ? 'search_off' : 'key'} size={32} className="text-brand-400" />
            </div>
            <p className="text-ink-900 font-bold text-lg mb-1">
              {search ? 'No results found' : 'Your vault is empty'}
            </p>
            <p className="text-sm text-ink-500 mb-6 max-w-xs mx-auto">
              {search
                ? 'Try searching by platform name or username.'
                : 'Save your first password to get started. All passwords are stored securely.'}
            </p>
            {!search && (
              <Button onClick={() => setAddOpen(true)}>
                <Icon name="add" size={15} />
                Save First Password
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
                  onEdit={setEditEntry}
                  onDelete={setDeleteTarget}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-ink-400 text-center mt-6">
            {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
            {search && ` matching "${search}"`}
          </p>
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Save Password">
        <EntryForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          submitting={createEntry.isPending}
          submitLabel="Save Password"
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="Edit Password"
      >
        {editEntry && (
          <EntryForm
            initial={{
              platform: editEntry.platform,
              siteUrl: editEntry.site_url,
              faviconUrl: editEntry.favicon_url,
              username: editEntry.username,
              password: editEntry.encrypted_data,
              notes: editEntry.notes,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditEntry(null)}
            submitting={updateEntry.isPending}
            submitLabel="Update Password"
          />
        )}
      </Modal>

      {/* Delete confirm */}
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
