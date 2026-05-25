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
        // Mobile: slides up as bottom sheet. sm+: centered dialog.
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={cn(
              // Mobile: bottom sheet
              'relative z-10 w-full bg-gray-900 border-t border-gray-700/80 shadow-2xl',
              'rounded-t-3xl max-h-[92dvh] flex flex-col',
              // Tablet+: centered card
              'sm:rounded-2xl sm:border sm:border-gray-700 sm:max-w-lg sm:max-h-[90dvh]',
              className,
            )}
          >
            {/* Drag handle visible on mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-0.5 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            )}

            <div className="overflow-y-auto overscroll-contain flex-1 p-5">
              {children}
            </div>

            {/* Safe-area bottom padding on mobile */}
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
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 sm:border-transparent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
