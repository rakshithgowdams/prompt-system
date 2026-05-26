import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import App from './App.tsx';
import './index.css';

gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis smooth scroll globally
const lenis = new Lenis({ duration: 1.2, smoothWheel: true });

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Expose lenis so landing page components can pause/resume if needed
(window as unknown as Record<string, unknown>).__lenis = lenis;

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
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
          gap: '1rem',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0, maxWidth: '360px' }}>
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.6rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
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
