import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';
import { useCreateFileShare, useFileShares, useDeleteFileShare } from '../../hooks/useFileShares';
import type { ProjectFile, Folder, FileShare } from '../../lib/database.types';

type AccessType = 'anyone' | 'can_edit' | 'password';

function shareUrl(shareId: string) {
  return `${window.location.origin}/share/${shareId}`;
}

function formatExpiry(dt: string | null) {
  if (!dt) return 'Never';
  const d = new Date(dt);
  if (d < new Date()) return 'Expired';
  return d.toLocaleDateString();
}

const ACCESS_OPTIONS: {
  value: AccessType;
  label: string;
  description: string;
  icon: string;
  activeClass: string;
  iconActiveClass: string;
  badge: string;
  badgeClass: string;
}[] = [
  {
    value: 'anyone',
    label: 'View only',
    description: 'Anyone with the link can view files',
    icon: 'visibility',
    activeClass: 'bg-green-50 border-green-300 ring-1 ring-green-200',
    iconActiveClass: 'bg-green-50 border-green-200 text-success',
    badge: 'View',
    badgeClass: 'bg-green-50 text-success border-green-200',
  },
  {
    value: 'can_edit',
    label: 'Can edit',
    description: 'Anyone with the link can rename & delete files',
    icon: 'edit',
    activeClass: 'bg-brand-50 border-brand-100 ring-1 ring-brand-100',
    iconActiveClass: 'bg-brand-50 border-brand-100 text-brand-400',
    badge: 'Edit',
    badgeClass: 'bg-brand-50 text-brand-400 border-brand-100',
  },
  {
    value: 'password',
    label: 'Password protected',
    description: 'Recipient must enter a password to open',
    icon: 'lock',
    activeClass: 'bg-amber-50 border-amber-200 ring-1 ring-amber-100',
    iconActiveClass: 'bg-amber-50 border-amber-200 text-amber-600',
    badge: 'Password',
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
  },
];

// ── Standalone toggle component ───────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100',
        checked ? 'bg-brand-400 border-brand-400' : 'bg-ink-300 border-ink-300',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
        style={{ marginTop: '1px' }}
      />
    </button>
  );
}

// ── Radio dot ─────────────────────────────────────────────────────────────────
function RadioDot({ checked }: { checked: boolean }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150',
      checked ? 'border-brand-400 bg-brand-400' : 'border-ink-400 bg-transparent',
    )}>
      {checked && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  file?: ProjectFile | null;
  folder?: Folder | null;
}

export function FileShareModal({ open, onClose, projectId, file, folder }: Props) {
  const { data: shares = [], isLoading } = useFileShares(projectId);
  const createShare = useCreateFileShare();
  const deleteShare = useDeleteFileShare();

  const [step, setStep] = useState<'list' | 'create'>('list');
  const [shareName, setShareName] = useState('');
  const [accessType, setAccessType] = useState<AccessType>('anyone');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  // Default OFF — user must consciously enable download
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const relevantShares = shares.filter((s) => {
    if (file) return s.file_id === file.id;
    if (folder) return s.folder_id === folder.id;
    return !s.file_id && !s.folder_id;
  });

  const reset = () => {
    setStep('list');
    setShareName('');
    setPassword('');
    setExpiresAt('');
    setAccessType('anyone');
    setAllowDownload(false);
    setShowPw(false);
  };

  const handleCreate = async () => {
    if (!shareName.trim()) { toast.error('Link name is required'); return; }
    if (accessType === 'password' && !password.trim()) { toast.error('Password is required'); return; }
    try {
      await createShare.mutateAsync({
        projectId,
        fileId: file?.id ?? null,
        folderId: folder?.id ?? null,
        shareName: shareName.trim(),
        accessType,
        password: accessType === 'password' ? password : undefined,
        allowDownload,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast.success('Share link created');
      reset();
    } catch {
      toast.error('Failed to create share');
    }
  };

  const copyLink = async (shareId: string) => {
    await navigator.clipboard.writeText(shareUrl(shareId));
    setCopiedId(shareId);
    toast.success('Link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (share: FileShare) => {
    try {
      await deleteShare.mutateAsync({ id: share.id, projectId });
      toast.success('Share removed');
    } catch {
      toast.error('Failed to remove share');
    }
  };

  const targetLabel = file ? file.file_name : folder ? folder.name : 'project';
  const accessOption = (t: AccessType) => ACCESS_OPTIONS.find((o) => o.value === t)!;

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title={step === 'list' ? `Share "${targetLabel}"` : 'Create Share Link'}
      className="sm:max-w-lg"
    >
      <AnimatePresence mode="wait" initial={false}>

        {/* ── List step ──────────────────────────────────────────────────────── */}
        {step === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3 p-3 bg-brand-50 border border-brand-100 rounded-md">
              <Icon name="info" size={16} className="text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-700 leading-relaxed">
                Create a link to share <strong className="text-brand-900">{targetLabel}</strong>.
                Choose whether recipients can view only, edit, or need a password to access.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 bg-ink-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : relevantShares.length === 0 ? (
              <div className="py-8 text-center">
                <Icon name="link_off" size={28} className="text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-400">No share links yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                {relevantShares.map((share) => {
                  const opt = accessOption(share.access_type as AccessType);
                  return (
                    <motion.div
                      key={share.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-3 p-3 bg-white border border-ink-300 rounded-lg"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border',
                        opt.badgeClass,
                      )}>
                        <Icon name={opt.icon} size={15} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-ink-900 truncate">{share.share_name}</p>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap', opt.badgeClass)}>
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5 truncate">
                          {share.view_count} view{share.view_count !== 1 ? 's' : ''} ·
                          {' '}Expires {formatExpiry(share.expires_at)}
                          {!share.allow_download ? ' · No download' : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => copyLink(share.id)}
                          className="p-2 rounded-md hover:bg-ink-100 text-ink-400 hover:text-ink-900 transition-colors"
                          title="Copy link"
                        >
                          <Icon
                            name={copiedId === share.id ? 'check' : 'content_copy'}
                            size={15}
                            className={copiedId === share.id ? 'text-emerald-400' : ''}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(share)}
                          className="p-2 rounded-md hover:bg-red-50 text-ink-400 hover:text-danger transition-colors"
                          title="Delete link"
                        >
                          <Icon name="delete" size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <Button className="w-full" onClick={() => setStep('create')}>
              <Icon name="add_link" size={16} />
              Create Share Link
            </Button>
          </motion.div>

        ) : (

          /* ── Create step ─────────────────────────────────────────────────── */
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="space-y-5"
          >
            {/* Link name */}
            <div>
              <label className="text-sm font-medium text-ink-700 block mb-1.5">
                Link Name
              </label>
              <input
                type="text"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="e.g. Client preview, Team review…"
                className="w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
              />
            </div>

            {/* Access type — radio card list */}
            <div>
              <label className="text-sm font-medium text-ink-700 block mb-2">
                Access Level
              </label>
              <div className="space-y-2">
                {ACCESS_OPTIONS.map((opt) => {
                  const selected = accessType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAccessType(opt.value)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-md border text-left transition-all duration-150',
                        selected
                          ? opt.activeClass
                          : 'bg-white border-ink-300 hover:border-ink-500 hover:bg-ink-50',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors',
                        selected ? opt.iconActiveClass : 'bg-ink-100 border-ink-300 text-ink-400',
                      )}>
                        <Icon name={opt.icon} size={17} />
                      </div>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold leading-tight',
                          selected ? 'text-ink-900' : 'text-ink-700',
                        )}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-ink-400 mt-0.5 leading-snug">{opt.description}</p>
                      </div>

                      {/* Radio dot — always has fixed width so it never overflows */}
                      <RadioDot checked={selected} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password field — animated reveal */}
            <AnimatePresence initial={false}>
              {accessType === 'password' && (
                <motion.div
                  key="pw-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon name="lock" size={14} className="text-amber-600 flex-shrink-0" />
                      <p className="text-xs font-medium text-amber-700">
                        Set the password recipients must enter
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter access password…"
                        className="w-full bg-white border border-amber-300 rounded-md px-3 py-2.5 pr-10 text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                      >
                        <Icon name={showPw ? 'visibility_off' : 'visibility'} size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Allow download toggle */}
            <div className="flex items-center justify-between gap-4 p-3.5 bg-ink-50 rounded-md border border-ink-200">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">Allow download</p>
                <p className="text-xs text-ink-400 mt-0.5">Recipients can download files</p>
              </div>
              <Toggle checked={allowDownload} onChange={setAllowDownload} />
            </div>

            {/* Expiry date */}
            <div>
              <label className="text-sm font-medium text-ink-700 block mb-1.5">
                Expires{' '}
                <span className="text-ink-400 font-normal text-xs">(optional)</span>
              </label>
              <input
                type="date"
                value={expiresAt}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-ink-100 border border-ink-300 rounded-md px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep('list')}>
                Back
              </Button>
              <Button className="flex-1" loading={createShare.isPending} onClick={handleCreate}>
                <Icon name="add_link" size={16} />
                Create Link
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
