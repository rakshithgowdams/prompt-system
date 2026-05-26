import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useCourseShares, useCreateCourseShare, useDeleteCourseShare, useToggleCourseShare } from '../../hooks/useCourses';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { CourseShare } from '../../hooks/useCourses';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildShareUrl(shareId: string): string {
  return `${window.location.origin}/courses/share/${shareId}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ink-100 hover:bg-ink-200 text-xs text-ink-700 transition-colors flex-shrink-0"
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={12} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ShareRow({ share, courseId }: { share: CourseShare; courseId: string }) {
  const deleteShare = useDeleteCourseShare();
  const toggleShare = useToggleCourseShare();
  const shareUrl = buildShareUrl(share.id);

  const isExpired = share.expires_at ? new Date(share.expires_at) < new Date() : false;

  return (
    <div className={cn(
      'bg-white border rounded-lg p-3 space-y-2.5 transition-opacity',
      !share.is_active || isExpired ? 'opacity-50 border-ink-200' : 'border-ink-300',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
            share.access_type === 'password' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-success',
          )}>
            <Icon name={share.access_type === 'password' ? 'lock' : 'public'} size={12} />
          </div>
          <span className="text-sm font-medium text-ink-900 truncate">{share.share_name || 'Untitled Link'}</span>
          {isExpired && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-danger border border-red-200 rounded-full flex-shrink-0">EXPIRED</span>
          )}
          {!share.is_active && !isExpired && (
            <span className="text-[10px] px-1.5 py-0.5 bg-ink-100 text-ink-500 border border-ink-300 rounded-full flex-shrink-0">DISABLED</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => toggleShare.mutate({ id: share.id, courseId, is_active: !share.is_active })}
            className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            title={share.is_active ? 'Disable link' : 'Enable link'}
          >
            <Icon name={share.is_active ? 'toggle_on' : 'toggle_off'} size={16} />
          </button>
          <button
            onClick={() => {
              if (!confirm('Delete this share link?')) return;
              deleteShare.mutate({ id: share.id, courseId });
            }}
            className="p-1.5 rounded-md text-ink-400 hover:text-danger hover:bg-red-50 transition-colors"
          >
            <Icon name="delete" size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-ink-50 border border-ink-200 rounded-md px-3 py-1.5">
          <p className="text-xs text-ink-500 font-mono truncate">{shareUrl}</p>
        </div>
        <CopyButton value={shareUrl} />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-ink-400">
        <span className="flex items-center gap-1">
          <Icon name="visibility" size={11} />
          {share.view_count} views
        </span>
        {share.access_type === 'password' && (
          <span className="flex items-center gap-1 text-amber-500">
            <Icon name="lock" size={11} />
            Password protected
          </span>
        )}
        {share.expires_at && (
          <span className="flex items-center gap-1">
            <Icon name="schedule" size={11} />
            Expires {new Date(share.expires_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateShareForm({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const createShare = useCreateCourseShare();
  const [name, setName] = useState('');
  const [accessType, setAccessType] = useState<'public' | 'password'>('public');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiryType, setExpiryType] = useState<'never' | '7d' | '30d' | 'custom'>('never');
  const [customDate, setCustomDate] = useState('');

  const getExpiresAt = (): string | null => {
    if (expiryType === 'never') return null;
    if (expiryType === '7d') return new Date(Date.now() + 7 * 86400000).toISOString();
    if (expiryType === '30d') return new Date(Date.now() + 30 * 86400000).toISOString();
    if (expiryType === 'custom' && customDate) return new Date(customDate).toISOString();
    return null;
  };

  const handleCreate = async () => {
    if (accessType === 'password' && !password.trim()) {
      toast.error('Enter a password for this link');
      return;
    }
    try {
      const password_hash = accessType === 'password' ? await sha256(password.trim()) : null;
      await createShare.mutateAsync({
        course_id: courseId,
        share_name: name.trim() || 'Share Link',
        access_type: accessType,
        password_hash,
        expires_at: getExpiresAt(),
      });
      toast.success('Share link created!');
      setName('');
      setPassword('');
      onCreated();
    } catch {
      toast.error('Failed to create share link');
    }
  };

  return (
    <div className="bg-ink-50 border border-ink-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">New Share Link</p>

      <div>
        <label className="text-xs text-ink-500 mb-1 block">Link Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Students batch 2025"
          className="w-full h-9 px-3 rounded-md bg-white border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 placeholder-ink-400"
        />
      </div>

      <div>
        <label className="text-xs text-ink-500 mb-1.5 block">Access</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['public', 'public', 'Open to anyone'],
            ['password', 'lock', 'Password protected'],
          ] as const).map(([val, icon, label]) => (
            <button
              key={val}
              onClick={() => setAccessType(val)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-md border text-xs font-medium transition-all text-left',
                accessType === val
                  ? 'bg-brand-50 border-brand-100 text-brand-400'
                  : 'bg-white border-ink-300 text-ink-500 hover:border-ink-500',
              )}
            >
              <Icon name={icon} size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {accessType === 'password' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <label className="text-xs text-ink-500 mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="w-full h-9 pl-3 pr-9 rounded-md bg-white border border-amber-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 placeholder-ink-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label className="text-xs text-ink-500 mb-1.5 block">Expires</label>
        <div className="flex gap-1.5 flex-wrap">
          {([
            ['never', 'Never'],
            ['7d', '7 days'],
            ['30d', '30 days'],
            ['custom', 'Custom'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setExpiryType(val)}
              className={cn(
                'px-2.5 py-1 rounded-md border text-xs font-medium transition-all',
                expiryType === val
                  ? 'bg-brand-50 border-brand-100 text-brand-400'
                  : 'bg-white border-ink-300 text-ink-500 hover:border-ink-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {expiryType === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2"
            >
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-9 px-3 rounded-md bg-white border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button className="w-full" onClick={handleCreate} loading={createShare.isPending}>
        <Icon name="link" size={14} />
        Generate Share Link
      </Button>
    </div>
  );
}

export function CourseShareModal({
  courseId,
  courseTitle,
  open,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: shares = [], isLoading } = useCourseShares(courseId);
  const [showForm, setShowForm] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md bg-white border border-ink-300 rounded-lg shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand-50 flex items-center justify-center">
              <Icon name="share" size={17} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Share Course</h2>
              <p className="text-xs text-ink-500 truncate max-w-[200px]">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-ink-100 hover:bg-ink-200 text-ink-500 hover:text-ink-900 transition-colors"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <CreateShareForm
                  courseId={courseId}
                  onCreated={() => setShowForm(false)}
                />
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-ink-300 hover:border-brand-400 text-ink-400 hover:text-brand-400 text-sm transition-colors"
              >
                <Icon name="add" size={15} />
                Create new share link
              </motion.button>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-ink-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : shares.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Active Links</p>
              {shares.map((share) => (
                <ShareRow key={share.id} share={share} courseId={courseId} />
              ))}
            </div>
          ) : !showForm ? (
            <div className="text-center py-8 text-ink-400 text-sm">
              No share links yet. Create one above.
            </div>
          ) : null}
        </div>

        <div className="px-5 py-3 border-t border-ink-200 flex-shrink-0">
          <p className="text-[11px] text-ink-400 text-center">
            Anyone with the link can view this course without signing in.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
