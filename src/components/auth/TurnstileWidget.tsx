import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    __turnstileReady?: boolean;
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

interface Props {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  action: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

type WidgetState = 'loading' | 'ready' | 'verified' | 'error' | 'expired';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

// ── Dev-only bypass widget ────────────────────────────────────────────────────
function DevBypassWidget({ onVerify }: { onVerify: (t: string) => void }) {
  useEffect(() => { onVerify('dev-bypass-no-key'); }, [onVerify]);
  return null;
}

// ── Real Turnstile widget ─────────────────────────────────────────────────────
function RealTurnstileWidget({ onVerify, onError, onExpire, action, theme = 'auto', className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!!window.__turnstileReady);
  const [widgetState, setWidgetState] = useState<WidgetState>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (ready) return;
    const handle = () => setReady(true);
    window.addEventListener('turnstile:ready', handle);
    const poll = setInterval(() => {
      if (window.__turnstileReady) { setReady(true); clearInterval(poll); }
    }, 200);
    const timeout = setTimeout(() => {
      if (!window.__turnstileReady) setWidgetState('error');
    }, 8000);
    return () => {
      window.removeEventListener('turnstile:ready', handle);
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [ready, retryKey]);

  const renderWidget = useCallback(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      widgetIdRef.current = null;
    }

    setWidgetState('ready');

    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY!,
      action,
      theme,
      size: 'flexible',
      retry: 'auto',
      callback: (token: string) => {
        setWidgetState('verified');
        onVerify(token);
      },
      'error-callback': () => {
        setWidgetState('error');
        onError?.();
      },
      'expired-callback': () => {
        setWidgetState('expired');
        onExpire?.();
      },
      'timeout-callback': () => {
        setWidgetState('error');
        onError?.();
      },
    });
    widgetIdRef.current = id;
  }, [ready, action, theme, onVerify, onError, onExpire]);

  useEffect(() => {
    if (!ready) return;
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [ready, renderWidget]);

  const handleRetry = () => {
    setWidgetState('loading');
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      widgetIdRef.current = null;
    }
    if (window.__turnstileReady && window.turnstile) {
      renderWidget();
    } else {
      setReady(false);
      setRetryKey((k) => k + 1);
    }
  };

  const showError = widgetState === 'error' || widgetState === 'expired';

  return (
    <div className={className}>
      {widgetState === 'loading' && (
        <div className="h-[65px] bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Loading security check…
        </div>
      )}

      {showError && (
        <div className="h-[65px] bg-red-50 border border-red-200 rounded-lg flex items-center justify-between px-4 gap-3">
          <p className="text-xs text-red-700 leading-snug">
            {widgetState === 'expired'
              ? 'Security check expired.'
              : 'Security check failed to load.'}
            {' '}Please retry.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex-shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 border border-red-300 hover:border-red-400 bg-white rounded px-2.5 py-1 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={widgetState === 'loading' || showError ? 'hidden' : ''}
      />
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function TurnstileWidget(props: Props) {
  if (!SITE_KEY) return <DevBypassWidget onVerify={props.onVerify} />;
  return <RealTurnstileWidget {...props} />;
}

export function resetTurnstile() {
  if (window.turnstile) window.turnstile.reset();
}
