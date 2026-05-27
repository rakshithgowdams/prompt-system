import { useEffect, useRef, useState } from 'react';

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

export function TurnstileWidget({ onVerify, onError, onExpire, action, theme = 'auto', className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(!!window.__turnstileReady);

  useEffect(() => {
    if (ready) return;
    const handle = () => setReady(true);
    window.addEventListener('turnstile:ready', handle);
    const poll = setInterval(() => {
      if (window.__turnstileReady) { setReady(true); clearInterval(poll); }
    }, 200);
    return () => {
      window.removeEventListener('turnstile:ready', handle);
      clearInterval(poll);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      onVerify('dev-bypass-no-key');
      return;
    }

    const id = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme,
      size: 'flexible',
      retry: 'auto',
      callback: (token: string) => onVerify(token),
      'error-callback': () => onError?.(),
      'expired-callback': () => onExpire?.(),
    });
    widgetIdRef.current = id;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, action, theme, onVerify, onError, onExpire]);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <div className={className}>
      {!ready && (
        <div className="h-[65px] bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
          Loading security check...
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

export function resetTurnstile() {
  if (window.turnstile) window.turnstile.reset();
}
