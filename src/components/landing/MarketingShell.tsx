import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Instagram, Twitter, Youtube } from 'lucide-react';

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    if (location.pathname !== '/') {
      window.location.href = `/#${id}`;
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'h-14 bg-white/95 backdrop-blur-xl border-b border-ink-300/80 shadow-sm'
          : 'h-16 bg-white/70 backdrop-blur-xl border-b border-ink-300/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center shadow-sm">
            <Lock className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-extrabold text-ink-900 text-base tracking-tight">
            PromptVault
          </span>
        </Link>

        {/* Center nav — desktop only */}
        <nav className="hidden md:flex items-center gap-7">
          {isLanding ? (
            <>
              <button onClick={() => scrollTo('features')} className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Features</button>
              <button onClick={() => scrollTo('courses')} className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Courses</button>
              <Link to="/pricing" className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Pricing</Link>
              <button onClick={() => scrollTo('faq')} className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">FAQ</button>
            </>
          ) : (
            <>
              <Link to="/#features" className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Features</Link>
              <Link to="/#courses" className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Courses</Link>
              <Link to="/pricing" className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">Pricing</Link>
              <Link to="/#faq" className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors">FAQ</Link>
            </>
          )}
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-ink-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-ink-700 transition-colors shadow-sm"
          >
            Get started free
          </Link>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-1 p-1.5 rounded-md text-ink-700 hover:bg-ink-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-1">
              <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-ink-300 px-6 py-4 flex flex-col gap-4 shadow-lg">
          <button onClick={() => scrollTo('features')} className="text-sm font-semibold text-ink-700 text-left">Features</button>
          <button onClick={() => scrollTo('courses')} className="text-sm font-semibold text-ink-700 text-left">Courses</button>
          <Link to="/pricing" className="text-sm font-semibold text-ink-700" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <button onClick={() => scrollTo('faq')} className="text-sm font-semibold text-ink-700 text-left">FAQ</button>
          <hr className="border-ink-300" />
          <Link to="/login" className="text-sm font-semibold text-ink-700" onClick={() => setMobileOpen(false)}>Sign in</Link>
          <Link to="/signup" className="bg-ink-900 text-white text-sm font-bold px-4 py-2.5 rounded-lg text-center" onClick={() => setMobileOpen(false)}>Get started free</Link>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-16 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-extrabold text-white text-base">PromptVault</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Your prompts, projects, and learning — all in one vault. Free, forever, for students.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://instagram.com/aiwithrakshith"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com/@aiwithrakshith"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/aiwithrakshith"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Product</p>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Courses', 'Changelog'].map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'Pricing' ? '/pricing' : '/'}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Resources</p>
            <ul className="space-y-3">
              {['Help center', 'Community', 'Blog', 'Status'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-white/60 cursor-default">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Company</p>
            <ul className="space-y-3">
              <li><span className="text-sm text-white/60 cursor-default">About</span></li>
              <li><span className="text-sm text-white/60 cursor-default">Careers</span></li>
              <li><Link to="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        {/* Giant wordmark */}
        <div className="py-8 overflow-hidden">
          <p
            className="font-display font-extrabold tracking-tighter leading-none select-none text-center"
            style={{
              fontSize: 'clamp(60px, 15vw, 180px)',
              WebkitTextStroke: '1px rgba(255,255,255,0.12)',
              color: 'transparent',
            }}
          >
            PromptVault
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <p className="text-xs text-white/30">&copy; 2026 aiwithrakshith.tech. All rights reserved.</p>
          <p className="text-xs text-white/30">Developed by <a href="https://instagram.com/aiwithrakshith" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">@aiwithrakshith</a></p>
        </div>
      </div>
    </footer>
  );
}

interface Props { children: ReactNode; }

export function MarketingShell({ children }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={topRef} className="bg-white min-h-screen">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
