import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              'relative z-10 w-full bg-white border-t border-ink-300 shadow-2xl',
              'rounded-t-2xl max-h-[92dvh] flex flex-col',
              'sm:rounded-xl sm:border sm:border-ink-300 sm:max-w-lg sm:max-h-[90dvh]',
              className,
            )}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-0.5 flex-shrink-0">
              <div className="w-10 h-1 bg-ink-300 rounded-full" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-ink-300 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-ink-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors"
                  aria-label="Close"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            )}

            <div className="overflow-y-auto overscroll-contain flex-1 p-5">
              {children}
            </div>

            <div className="sm:hidden h-[env(safe-area-inset-bottom)] flex-shrink-0" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-ink-500 text-sm mb-5 leading-relaxed">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm text-ink-700 hover:bg-ink-100 border border-ink-300 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm bg-danger hover:bg-danger/90 text-white font-bold transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
