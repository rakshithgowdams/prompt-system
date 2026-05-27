import { StrictMode, Component, useState, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase.ts';

gsap.registerPlugin(ScrollTrigger);

// Lenis is NOT initialized here. It is mounted/unmounted per-route by
// <LenisScrollManager /> in App.tsx to prevent wheel-event hijacking on
// pages that use internal overflow-y-auto scroll containers.

// ── Detect chunk-load failures (stale deploy) ─────────────────────────────────
function isChunkLoadError(err: Error): boolean {
  const msg = (err.message + (err.stack ?? '')).toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to load module script') ||
    msg.includes('dynamically imported module') ||
    msg.includes('loading css chunk')
  );
}

// ── New-version banner shown when a chunk-load error is detected ──────────────
function UpdateAvailableScreen() {
  const [reloading, setReloading] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Auto-reload after 10 s so the user doesn't have to do anything
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          window.location.reload();
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const reload = () => {
    setReloading(true);
    window.location.reload();
  };

  const s = {
    wrap: {
      minHeight: '100dvh',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      background: '#030712',
      color: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
      textAlign: 'center' as const,
      gap: '1.5rem',
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '20px',
      padding: '28px 24px',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      gap: '16px',
      alignItems: 'center' as const,
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: '#0c4a6e',
      color: '#38bdf8',
      borderRadius: '100px',
      padding: '5px 12px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },
    title: { fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.3 },
    body: { fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.7, maxWidth: '320px' },
    btn: {
      width: '100%',
      padding: '13px 20px',
      background: reloading ? '#1d4ed8' : '#2563eb',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: reloading ? 'default' : 'pointer',
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: '8px',
      opacity: reloading ? 0.8 : 1,
    },
    counter: { fontSize: '12px', color: '#475569' },
  };

  return (
    <div style={s.wrap}>
      {/* Animated ring */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="36" cy="36" r="30" fill="none" stroke="#1e3a5f" strokeWidth="4" />
          <circle
            cx="36" cy="36" r="30"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeDasharray={`${188 * (1 - countdown / 10)} 188`}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
            style={{ transition: 'stroke-dasharray 0.9s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.badge}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="5" cy="5" r="4.5" />
          </svg>
          New version available
        </div>

        <p style={s.title}>App updated!</p>

        <p style={s.body}>
          A new version of the app has been deployed. Your browser cached an older version of the page.
          We'll reload automatically to get the latest update.
        </p>

        <button onClick={reload} disabled={reloading} style={s.btn}>
          {reloading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Updating…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Update now
            </>
          )}
        </button>

        <p style={s.counter}>Auto-updating in {countdown}s…</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Inline error report form rendered inside ErrorBoundary ────────────────────
function ErrorReportForm({ errorStack }: { errorStack: string }) {
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // Use edge function so the direct anon INSERT policy is no longer needed
      await supabase.functions.invoke('submit-bug-report', {
        body: {
          title: 'App crashed: ' + errorStack.split('\n')[0].slice(0, 120),
          description: description.trim(),
          page_url: window.location.href,
          error_stack: errorStack,
          captcha_token: '',
        },
      });
      setSent(true);
    } catch {
      // best-effort — don't cascade another error
    } finally {
      setSending(false);
    }
  };

  const s = {
    card: {
      width: '100%',
      maxWidth: '420px',
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      gap: '14px',
    },
    label: { fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' },
    textarea: { width: '100%', resize: 'none' as const, background: '#1f2937', border: '1px solid #374151', borderRadius: '10px', color: '#f3f4f6', fontSize: '13px', padding: '10px 12px', lineHeight: '1.6', outline: 'none', boxSizing: 'border-box' as const },
    row: { display: 'flex', gap: '10px' },
    btnPrimary: { flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnGhost: { flex: 1, padding: '10px', background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  };

  if (sent) {
    return (
      <div style={s.card}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" style={{ margin: '0 auto 10px' }}>
            <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
          </svg>
          <p style={{ color: '#f9fafb', fontWeight: 700, fontSize: '15px', margin: '0 0 6px' }}>Report sent!</p>
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Thank you. We'll investigate this shortly.</p>
        </div>
        <button onClick={() => window.location.reload()} style={s.btnPrimary}>Reload page</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={s.card}>
      <p style={{ color: '#d1d5db', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
        Help us fix this by describing what you were doing before the crash.
      </p>
      <div>
        <label style={s.label}>What were you doing?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I clicked on a prompt card and the page crashed"
          rows={3}
          style={s.textarea}
        />
      </div>
      <div style={s.row}>
        <button type="button" onClick={() => window.location.reload()} style={s.btnGhost}>
          Just reload
        </button>
        <button type="submit" disabled={sending} style={{ ...s.btnPrimary, opacity: sending ? 0.6 : 1 }}>
          {sending ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </form>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;

      // Chunk load failures mean the deployment updated and the old hashed
      // JS file no longer exists on the CDN. Show a friendly "update available"
      // screen and auto-reload — don't show the crash/bug-report form.
      if (isChunkLoadError(err)) {
        return <UpdateAvailableScreen />;
      }

      const stack = err.stack ?? err.message ?? 'Unknown error';
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#030712',
          color: '#f9fafb',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.25rem',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Something went wrong</h1>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, maxWidth: '380px' }}>
              {err.message}
            </p>
          </div>
          <ErrorReportForm errorStack={stack} />
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
