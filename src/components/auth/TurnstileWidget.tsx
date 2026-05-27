import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../ui/Icon';

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    __turnstileReady?: boolean;
    __turnstileFailed?: boolean;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  retry?: 'auto' | 'never';
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  action: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

// ── Dev bypass — no site key configured ──────────────────────────────────────
function DevBypassWidget({ onVerify }: { onVerify: (t: string) => void }) {
  useEffect(() => { onVerify('dev-bypass-no-key'); }, [onVerify]);
  return null;
}

// ── Invisible Turnstile (interaction-only) ────────────────────────────────────
// Renders completely hidden. Cloudflare solves automatically for real users.
// If it can't auto-solve, it calls onNeedChallenge so the parent can show
// the challenge container in a modal overlay.

interface InvisibleTurnstileProps extends TurnstileWidgetProps {
  onNeedChallenge?: () => void;
  onChallengeResolved?: () => void;
  /** Ref so the parent can call reset() imperatively */
  imperativeRef?: React.RefObject<{ reset: () => void }>;
}

function InvisibleTurnstile({
  onVerify, onError, onExpire, onNeedChallenge, onChallengeResolved,
  action, theme = 'light', imperativeRef,
}: InvisibleTurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!!window.__turnstileReady);
  const [loadError, setLoadError] = useState(!!window.__turnstileFailed);
  const [retryKey, setRetryKey] = useState(0);

  // Expose reset to parent
  useEffect(() => {
    if (!imperativeRef) return;
    (imperativeRef as React.MutableRefObject<{ reset: () => void }>).current = {
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
        }
        onExpire?.();
      },
    };
  });

  useEffect(() => {
    if (ready) return;
    const handleReady = () => setReady(true);
    const handleFail = () => { setLoadError(true); onError?.(); };
    window.addEventListener('turnstile:ready', handleReady);
    window.addEventListener('turnstile:failed', handleFail);
    const poll = setInterval(() => {
      if (window.__turnstileReady) { setReady(true); clearInterval(poll); }
      if (window.__turnstileFailed) { setLoadError(true); clearInterval(poll); onError?.(); }
    }, 200);
    return () => {
      window.removeEventListener('turnstile:ready', handleReady);
      window.removeEventListener('turnstile:failed', handleFail);
      clearInterval(poll);
    };
  }, [ready, retryKey, onError]);

  // If Turnstile failed to load, surface a non-blocking message instead of hanging
  if (loadError) {
    return (
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
        Security check temporarily unavailable. You can still submit — please refresh if the issue persists.
      </div>
    );
  }

  const renderWidget = useCallback(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      widgetIdRef.current = null;
    }
    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY!,
      action,
      theme,
      size: 'flexible',
      appearance: 'interaction-only',
      retry: 'auto',
      callback: (token: string) => {
        onVerify(token);
        onChallengeResolved?.();
      },
      'error-callback': () => {
        onError?.();
      },
      'expired-callback': () => {
        onExpire?.();
        // Silently reset so next submit re-triggers
        if (widgetIdRef.current && window.turnstile) {
          try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
        }
      },
      'timeout-callback': () => {
        // interaction-only: widget needs user input — signal parent
        onNeedChallenge?.();
      },
    });
    widgetIdRef.current = id;
  }, [ready, action, theme, onVerify, onError, onExpire, onNeedChallenge, onChallengeResolved]);

  useEffect(() => {
    if (!ready) return;
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [ready, renderWidget, retryKey]);

  // Completely hidden — Cloudflare works in background
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
    />
  );
}

// ── Challenge modal — shown only when auto-verify can't complete ──────────────
function ChallengeModal({
  open,
  onClose,
  action,
  onVerify,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  action: string;
  onVerify: (token: string) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tryRender = () => {
      if (!containerRef.current || !window.turnstile || !SITE_KEY) return false;
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'light',
        size: 'normal',
        appearance: 'always',
        retry: 'auto',
        callback: (token: string) => {
          onVerify(token);
          onClose();
        },
        'error-callback': () => {
          onError();
          onClose();
        },
      });
      setWidgetReady(true);
      return true;
    };

    if (!tryRender()) {
      const poll = setInterval(() => { if (tryRender()) clearInterval(poll); }, 200);
      return () => clearInterval(poll);
    }
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
      setWidgetReady(false);
    };
  }, [open, action, onVerify, onError, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="security" size={20} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">Security Verification</p>
                  <p className="text-xs text-ink-500 mt-0.5">One quick check to continue</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            <p className="text-xs text-ink-500 mb-4 leading-relaxed">
              We couldn't automatically verify your browser. Please complete this quick check — it only takes a second.
            </p>

            {/* Turnstile widget renders here */}
            <div className="flex justify-center min-h-[65px] items-center">
              {!widgetReady && (
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <div className="w-4 h-4 border-2 border-ink-300 border-t-ink-600 rounded-full animate-spin" />
                  Loading…
                </div>
              )}
              <div ref={containerRef} className={widgetReady ? '' : 'hidden'} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Public composite component ────────────────────────────────────────────────
// Drop-in replacement for the old TurnstileWidget.
// Renders invisible by default; shows a modal only when Cloudflare requires
// manual interaction. The parent's API is unchanged.

export function TurnstileWidget(props: TurnstileWidgetProps) {
  const [challengeOpen, setChallengeOpen] = useState(false);

  if (!SITE_KEY) return <DevBypassWidget onVerify={props.onVerify} />;

  return (
    <>
      <InvisibleTurnstile
        {...props}
        onNeedChallenge={() => setChallengeOpen(true)}
        onChallengeResolved={() => setChallengeOpen(false)}
      />
      <ChallengeModal
        open={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        action={props.action}
        onVerify={(token) => { props.onVerify(token); setChallengeOpen(false); }}
        onError={() => { props.onError?.(); setChallengeOpen(false); }}
      />
    </>
  );
}

export function resetTurnstile() {
  if (window.turnstile) window.turnstile.reset();
}
