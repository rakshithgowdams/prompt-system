import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Twitter, Youtube } from 'lucide-react';
import { MagneticButton } from './motion';

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

  const navLinks = isLanding
    ? [
        { label: 'Features', action: () => scrollTo('features') },
        { label: 'Courses', action: () => scrollTo('courses') },
        { label: 'Pricing', href: '/pricing' },
        { label: 'FAQ', action: () => scrollTo('faq') },
      ]
    : [
        { label: 'Features', href: '/#features' },
        { label: 'Courses', href: '/#courses' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'FAQ', href: '/#faq' },
      ];

  return (
    <motion.header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'h-14 bg-white/95 backdrop-blur-xl border-b border-ink-300/80 shadow-sm'
          : 'h-16 bg-white/70 backdrop-blur-xl border-b border-ink-300/40'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <motion.img
            src="/favicon.svg"
            alt="aiwithrakshith.tech"
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="h-9 w-9 object-contain flex-shrink-0"
          />
          <motion.span
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="hidden sm:block font-display font-black text-ink-900 tracking-tight leading-none"
            style={{ fontSize: '15px', letterSpacing: '-0.02em', marginLeft: '10px', marginRight: '10px' }}
          >
            aiwithrakshith
          </motion.span>
        </Link>

        {/* Center nav — desktop */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            link.href ? (
              <motion.div key={link.label} whileHover={{ y: -1 }}>
                <Link
                  to={link.href}
                  className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors relative group"
                >
                  {link.label}
                  <motion.div
                    className="absolute -bottom-0.5 left-0 h-0.5 bg-brand-400 rounded-full"
                    initial={{ width: 0 }}
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
              </motion.div>
            ) : (
              <motion.div key={link.label} whileHover={{ y: -1 }}>
                <button
                  onClick={link.action}
                  className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors relative group"
                >
                  {link.label}
                  <motion.div
                    className="absolute -bottom-0.5 left-0 h-0.5 bg-brand-400 rounded-full"
                    initial={{ width: 0 }}
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.2 }}
                  />
                </button>
              </motion.div>
            )
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div whileHover={{ y: -1 }} className="hidden md:block">
            <Link
              to="/login"
              className="text-sm font-semibold text-ink-700 hover:text-ink-900 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
          </motion.div>

          <MagneticButton
            as="a"
            href="/signup"
            className="hidden sm:inline-flex items-center gap-2 bg-ink-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors shadow-sm cursor-pointer"
          >
            Get started free
          </MagneticButton>

          {/* Hamburger */}
          <motion.button
            className="md:hidden p-1.5 rounded-md text-ink-700 hover:bg-ink-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            whileTap={{ scale: 0.9 }}
          >
            <div className="w-5 flex flex-col gap-1">
              <motion.span
                animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="block h-0.5 bg-current rounded-full"
                transition={{ duration: 0.25 }}
              />
              <motion.span
                animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                className="block h-0.5 bg-current rounded-full"
                transition={{ duration: 0.2 }}
              />
              <motion.span
                animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="block h-0.5 bg-current rounded-full"
                transition={{ duration: 0.25 }}
              />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden bg-white border-t border-ink-300 overflow-hidden shadow-lg"
          >
            <motion.div
              className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-1"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
            >
              {navLinks.map((link) => (
                <motion.div
                  key={link.label}
                  variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.3 }}
                >
                  {link.href ? (
                    <Link
                      to={link.href}
                      className="block py-2.5 text-sm font-semibold text-ink-700 hover:text-brand-500 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <button
                      onClick={link.action}
                      className="block py-2.5 text-sm font-semibold text-ink-700 hover:text-brand-500 transition-colors text-left w-full"
                    >
                      {link.label}
                    </button>
                  )}
                </motion.div>
              ))}
              <motion.hr
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="border-ink-300 my-1"
              />
              <motion.div variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}>
                <Link to="/login" className="block py-2.5 text-sm font-semibold text-ink-700" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                <Link
                  to="/signup"
                  className="block bg-ink-900 text-white text-sm font-bold px-4 py-3 rounded-xl text-center mt-1 hover:bg-brand-400 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Get started free
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Footer() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-16 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <img src="/favicon.svg" alt="aiwithrakshith.tech" className="h-11 w-11 object-contain brightness-0 invert flex-shrink-0" />
              <span className="font-display font-black text-white tracking-tight leading-none" style={{ fontSize: '16px', letterSpacing: '-0.02em' }}>
                aiwithrakshith
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Your prompts, projects, and learning — all in one vault. Free, forever, for students.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[
                { href: 'https://instagram.com/aiwithrakshith', Icon: Instagram, label: 'Instagram' },
                { href: 'https://youtube.com/@aiwithrakshith', Icon: Youtube, label: 'YouTube' },
                { href: 'https://twitter.com/aiwithrakshith', Icon: Twitter, label: 'Twitter' },
              ].map(({ href, Icon, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Product</p>
            <ul className="space-y-3">
              {['Features', 'Pricing', 'Courses', 'Changelog'].map((item) => (
                <li key={item}>
                  <motion.div whileHover={{ x: 4 }}>
                    <Link
                      to={item === 'Pricing' ? '/pricing' : '/'}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </motion.div>
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
                  <motion.span whileHover={{ x: 4 }} className="block text-sm text-white/60 cursor-default">
                    {item}
                  </motion.span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">Company</p>
            <ul className="space-y-3">
              <li><motion.span whileHover={{ x: 4 }} className="block text-sm text-white/60 cursor-default">About</motion.span></li>
              <li><motion.span whileHover={{ x: 4 }} className="block text-sm text-white/60 cursor-default">Careers</motion.span></li>
              <li><motion.div whileHover={{ x: 4 }}><Link to="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy</Link></motion.div></li>
              <li><motion.div whileHover={{ x: 4 }}><Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms</Link></motion.div></li>
            </ul>
          </div>
        </div>

        {/* Giant wordmark */}
        <motion.div
          className="py-8 overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="font-display font-extrabold tracking-tighter leading-none select-none text-center"
            style={{
              fontSize: 'clamp(40px, 12vw, 160px)',
              WebkitTextStroke: '1px rgba(255,255,255,0.12)',
              color: 'transparent',
            }}
          >
            @aiwithrakshith
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <p className="text-xs text-white/30">&copy; 2026 aiwithrakshith.tech. All rights reserved.</p>
          <p className="text-xs text-white/30">
            Developed by{' '}
            <a href="https://instagram.com/aiwithrakshith" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
              @aiwithrakshith
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

interface Props { children: ReactNode; }

export function MarketingShell({ children }: Props) {
  return (
    <div className="bg-white min-h-screen">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
