import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  onSuccess?: () => void;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function AuthModal({ open, onClose, defaultTab = 'login', onSuccess }: Props) {
  const { signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    if (tab === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else if (data.session) {
        toast.success('Signed in!');
        onClose();
        onSuccess?.();
      }
    } else {
      // Quick signup via OTP flow — redirect to full signup page for full flow
      toast.info('Creating your account...');
      const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to send verification code. Please use the full signup page.');
      } else {
        onClose();
        window.location.href = `/signup?prefill=${encodeURIComponent(email)}`;
      }
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-[10001] p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
              {/* Top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-blue-400 to-brand-300" />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <img src="/aiwithrakshith-tech-logo.webp" alt="aiwithrakshith.tech" className="h-8 w-8 object-contain" />
                    <span className="font-display font-black text-ink-900 text-sm tracking-tight">aiwithrakshith</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-ink-100 rounded-xl p-1 mb-5">
                  {(['login', 'signup'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === t
                          ? 'bg-white text-ink-900 shadow-sm'
                          : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      {t === 'login' ? 'Sign in' : 'Sign up'}
                    </button>
                  ))}
                </div>

                {/* Google button */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                  className="w-full flex items-center justify-center gap-3 h-11 border border-ink-300 rounded-xl bg-white hover:bg-ink-50 hover:border-ink-400 transition-all text-sm font-semibold text-ink-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mb-4"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-ink-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-ink-200" />
                  <span className="text-xs text-ink-400 font-medium">or with email</span>
                  <div className="flex-1 h-px bg-ink-200" />
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors placeholder-ink-400"
                    required
                    autoComplete="email"
                  />
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 px-3.5 pr-10 rounded-xl bg-ink-100 border border-ink-300 text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors placeholder-ink-400"
                      required
                      minLength={tab === 'signup' ? 8 : 6}
                      autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                    >
                      <Icon name={showPw ? 'visibility_off' : 'visibility'} size={16} />
                    </button>
                  </div>

                  {tab === 'login' && (
                    <div className="text-right">
                      <Link
                        to="/forgot-password"
                        onClick={onClose}
                        className="text-xs text-brand-400 hover:text-brand-500 transition-colors font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full h-11 bg-ink-900 hover:bg-ink-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {tab === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                </form>

                {tab === 'signup' && (
                  <p className="text-[11px] text-ink-400 text-center mt-3 leading-relaxed">
                    By creating an account you agree to our{' '}
                    <Link to="/terms" onClick={onClose} className="text-brand-400 hover:underline">Terms</Link>
                    {' & '}
                    <Link to="/privacy" onClick={onClose} className="text-brand-400 hover:underline">Privacy Policy</Link>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
