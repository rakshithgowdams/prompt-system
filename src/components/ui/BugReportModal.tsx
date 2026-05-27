import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { TurnstileWidget, resetTurnstile } from '../auth/TurnstileWidget';

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill an error stack trace (from ErrorBoundary) */
  errorStack?: string;
  /** Pre-fill a title (e.g. "App crashed: <error message>") */
  errorTitle?: string;
}

export function BugReportModal({ open, onClose, errorStack, errorTitle }: BugReportModalProps) {
  const [title, setTitle] = useState(errorTitle ?? '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showStack, setShowStack] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const reset = () => {
    setTitle(errorTitle ?? '');
    setDescription('');
    setSubmitting(false);
    setSubmitted(false);
    setShowStack(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-bug-report', {
        body: {
          title: title.trim(),
          description: description.trim(),
          page_url: window.location.href,
          error_stack: errorStack ?? null,
          captcha_token: captchaToken ?? '',
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error('Failed to submit report. Please try again.');
      resetTurnstile();
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 34, stiffness: 360, mass: 0.9 }}
            className="relative z-10 w-full bg-white rounded-t-3xl sm:rounded-2xl sm:max-w-md shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '92dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag pill — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-[5px] rounded-full bg-ink-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-ink-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <Bug size={15} className="text-red-500" />
                </div>
                <h2 className="text-[15px] font-bold text-ink-900">Report an Issue</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {submitted ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-green-500" />
                  </div>
                  <h3 className="text-[16px] font-bold text-ink-900">Thank you!</h3>
                  <p className="text-[13px] text-ink-500 max-w-xs leading-relaxed">
                    Your report has been received. We'll look into this as soon as possible.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-ink-900 text-white text-[13px] font-semibold hover:bg-ink-700 transition-colors active:scale-95"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                      What went wrong? <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Page crashed when clicking a card"
                      required
                      className="w-full text-[13px] border border-ink-200 rounded-xl px-3.5 py-2.5 bg-ink-50 text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                      More details <span className="text-ink-300">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Steps to reproduce, what you expected to happen, etc."
                      rows={4}
                      className="w-full resize-none text-[13px] border border-ink-200 rounded-xl px-3.5 py-2.5 bg-ink-50 text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-400 transition-all leading-relaxed"
                    />
                  </div>

                  {/* Error stack (collapsible, only shown when pre-filled) */}
                  {errorStack && (
                    <div className="rounded-xl border border-red-100 bg-red-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowStack((v) => !v)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-100/60 transition-colors"
                      >
                        <span>Error details (auto-attached)</span>
                        {showStack ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <AnimatePresence initial={false}>
                        {showStack && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <pre className="px-3.5 pb-3 text-[10px] text-red-700 font-mono whitespace-pre-wrap break-all leading-relaxed">
                              {errorStack}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Meta info note */}
                  <p className="text-[11px] text-ink-400 leading-relaxed">
                    We'll also capture the current page URL and your browser info to help us reproduce the issue.
                  </p>

                  {/* CAPTCHA */}
                  <TurnstileWidget
                    action="bug-report"
                    onVerify={setCaptchaToken}
                    onExpire={() => { setCaptchaToken(null); resetTurnstile(); }}
                    onError={() => setCaptchaToken(null)}
                  />

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold transition-all duration-200 active:scale-[0.98]',
                      submitting || !title.trim()
                        ? 'bg-ink-200 text-ink-400 cursor-not-allowed'
                        : 'bg-ink-900 text-white hover:bg-ink-700 shadow-lg shadow-ink-900/10',
                    )}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Safe area spacer */}
            <div className="flex-shrink-0" style={{ height: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
