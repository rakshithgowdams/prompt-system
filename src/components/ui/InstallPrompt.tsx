import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Instagram } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa-install-dismissed';

export function InstallPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    } else {
      setInstalling(false);
    }
  };

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    } else {
      setInstalling(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const steps = user
    ? [
        'Tap the button below to install',
        'Click "Add to Home Screen" when prompted',
        'Open it from your home screen anytime',
      ]
    : [
        'Sign in or create a free account',
        'Then tap install to add to home screen',
        'Open it from your home screen anytime',
      ];

  return (
    <>
      <AnimatePresence>
        {visible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={dismiss}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            />

            {/* Centred modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="pointer-events-auto w-full max-w-sm"
              >
                <div className="bg-white border border-ink-200 rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.28)] overflow-hidden">
                  {/* Top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-300 to-pink-400" />

                  <div className="p-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-brand-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-display font-extrabold text-base text-ink-900 tracking-tight leading-tight">
                            Install this app
                          </p>
                          <p className="text-[11px] text-ink-500 mt-0.5">aiwithrakshith.tech</p>
                        </div>
                      </div>
                      <button
                        onClick={dismiss}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors flex-shrink-0 -mt-0.5"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Body */}
                    <p className="text-[13px] text-ink-600 leading-relaxed mb-5">
                      Add this app to your home screen for a faster, full-screen experience — works offline too.
                    </p>

                    {/* Steps */}
                    <div className="space-y-2.5 mb-5">
                      {steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-brand-50 border border-brand-200 text-brand-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-[12.5px] text-ink-600 leading-snug">{step}</p>
                        </div>
                      ))}
                    </div>

                    {/* Install button */}
                    <button
                      onClick={handleInstall}
                      disabled={installing}
                      className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 active:bg-brand-600 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      {installing ? 'Installing…' : user ? 'Install App' : 'Sign in to Install'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-px bg-ink-200" />
                      <span className="text-[10px] text-ink-400 font-medium tracking-wide uppercase">Developed by</span>
                      <div className="flex-1 h-px bg-ink-200" />
                    </div>

                    {/* Instagram follow */}
                    <a
                      href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-ink-200 hover:border-pink-300 hover:bg-pink-50 transition-colors group"
                    >
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[12.5px] font-semibold text-ink-700 group-hover:text-pink-600 transition-colors">
                        Follow{' '}
                        <span className="text-pink-500 font-bold">@aiwithrakshith</span>
                      </span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="login"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
