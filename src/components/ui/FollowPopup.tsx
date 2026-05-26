import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'pv_follow_shown';

// Instagram SVG icon
function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// YouTube SVG icon
function YouTubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>
  );
}

// Avatar with graceful fallback to gradient initials if image fails to load
function AvatarImage() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
        <span className="text-white font-bold text-2xl select-none">R</span>
      </div>
    );
  }

  return (
    <img
      src="/avatar-rakshith.png"
      alt="@aiwithrakshith"
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function FollowPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show once per browser session (sessionStorage clears on tab close)
    const shown = sessionStorage.getItem(STORAGE_KEY);
    if (!shown) {
      // Small delay so the app has time to render first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000]"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm relative">
              {/* Glow ring */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-pink-500/30 via-transparent to-red-500/20 blur-sm" />

              <div className="relative bg-gray-900 border border-gray-700/80 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
                {/* Top gradient bar */}
                <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-red-500" />

                <div className="p-7">
                  {/* Close */}
                  <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {/* Avatar */}
                  <div className="flex justify-center mb-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-gray-900 ring-pink-500/60 shadow-lg shadow-pink-900/40">
                        <AvatarImage />
                      </div>
                      {/* Animated ring */}
                      <div className="absolute -inset-1.5 rounded-full border-2 border-pink-400/25 animate-ping" style={{ animationDuration: '2.5s' }} />
                    </div>
                  </div>

                  {/* Heading */}
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1.5">
                      Welcome to PromptVault!
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Created by <span className="text-pink-300 font-semibold">@aiwithrakshith</span> — follow for AI tips,
                      tutorials and more free tools like this one.
                    </p>
                  </div>

                  {/* Social buttons */}
                  <div className="space-y-3 mb-5">
                    <a
                      href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={dismiss}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:via-rose-400 hover:to-orange-400 text-white font-semibold text-sm shadow-lg shadow-pink-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <InstagramIcon size={16} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold leading-tight">Follow on Instagram</div>
                        <div className="text-xs text-white/70 font-normal">@aiwithrakshith</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M7 17L17 7M7 7h10v10"/>
                      </svg>
                    </a>

                    <a
                      href="https://www.youtube.com/@aiwithrakshith-MDN"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={dismiss}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <YouTubeIcon size={16} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold leading-tight">Subscribe on YouTube</div>
                        <div className="text-xs text-white/70 font-normal">@aiwithrakshith-MDN</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M7 17L17 7M7 7h10v10"/>
                      </svg>
                    </a>
                  </div>

                  {/* Skip */}
                  <button
                    onClick={dismiss}
                    className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors py-1"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
