import { StrictMode, Component, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase.ts';

gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis smooth scroll globally
const lenis = new Lenis({
  duration: 1.1,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.8,
  infinite: false,
  syncTouch: false,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Expose lenis so landing page components can pause/resume if needed
(window as unknown as Record<string, unknown>).__lenis = lenis;

// ── Inline error report form rendered inside ErrorBoundary ────────────────────
function ErrorReportForm({ errorStack }: { errorStack: string }) {
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supabase.from('bug_reports').insert({
        title: 'App crashed: ' + errorStack.split('\n')[0].slice(0, 120),
        description: description.trim(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        error_stack: errorStack,
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
