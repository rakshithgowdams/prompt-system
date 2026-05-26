import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

type VerifyState = 'pending' | 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') ?? '';
  const isPending = searchParams.get('pending') === '1';

  const [state, setState] = useState<VerifyState>(isPending ? 'pending' : 'verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(4);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Handle the verification token in the URL (user clicked the link) ──────
  useEffect(() => {
    if (isPending) return; // Don't process token if we're in pending state

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setState('success');
      }
    });

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const errorDesc =
      params.get('error_description') ??
      hashParams.get('error_description') ??
      params.get('error') ??
      hashParams.get('error');

    if (errorDesc) {
      setState('error');
      setErrorMsg(decodeURIComponent(errorDesc));
    }

    // Supabase client auto-processes the URL hash — give it a moment
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email_confirmed_at) {
          setState('success');
        } else if (!errorDesc) {
          setState('error');
          setErrorMsg('Verification link may have expired or already been used.');
        }
      });
    }, 2500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [isPending]);

  // ── Auto-redirect after success ───────────────────────────────────────────
  useEffect(() => {
    if (state !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/dashboard', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, navigate]);

  // ── Resend activation email ───────────────────────────────────────────────
  const handleResend = async () => {
    const email = emailParam;
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResent(true);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(interval); setResent(false); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      // Silently ignore — Supabase may rate-limit but the email may still be sent
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {/* ── PENDING: User hasn't clicked the link yet ── */}
        {state === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-sm"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
              <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600" />
              <div className="p-8">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-blue-500/10 border-2 border-blue-500/30 rounded-3xl flex items-center justify-center">
                      <Icon name="mark_email_unread" size={36} className="text-blue-400" />
                    </div>
                    <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">Activate your account</h1>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We sent an activation link to
                  </p>
                  {emailParam && (
                    <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl">
                      <Icon name="email" size={15} className="text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white break-all">{emailParam}</span>
                    </div>
                  )}
                </div>

                {/* Steps */}
                <div className="space-y-2.5 mb-6">
                  {[
                    { icon: 'inbox',    text: 'Open your email inbox' },
                    { icon: 'search',   text: 'Check Spam or Promotions if missing' },
                    { icon: 'verified', text: 'Click the activation link in the email' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Icon name={step.icon} size={15} className="text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-300">{step.text}</p>
                    </div>
                  ))}
                </div>

                {/* Resend */}
                {emailParam && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-3">Didn't receive it?</p>
                    {resent ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-2 text-sm text-emerald-400"
                      >
                        <Icon name="check_circle" size={15} />
                        Sent! Check your inbox.
                        {resendCooldown > 0 && <span className="text-gray-500 text-xs">({resendCooldown}s)</span>}
                      </motion.div>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={resending || resendCooldown > 0}
                        className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend activation email'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
              <Icon name="info" size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                The link expires in <span className="font-semibold">24 hours</span>.
                If you can't find the email, check your{' '}
                <span className="text-amber-300 font-medium">Spam</span> or{' '}
                <span className="text-amber-300 font-medium">Promotions</span> folder.
              </p>
            </div>

            <p className="text-center text-sm text-gray-600 mt-4">
              Wrong email?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Start over
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── VERIFYING: Processing the token from the email link ── */}
        {state === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-5"
          >
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 border-2 border-gray-800 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center">
                <Icon name="lock" size={16} className="text-blue-400" fill />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Activating your account…</p>
              <p className="text-gray-500 text-sm mt-1">Just a moment, verifying your email</p>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
              <div className="p-8 text-center">
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                    >
                      <Icon name="verified" size={38} className="text-emerald-400" fill />
                    </motion.div>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Account Activated!</h1>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Your email is verified and your account is now active. Welcome to PromptVault!
                </p>

                <div className="mb-5">
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 4, ease: 'linear' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Redirecting in <span className="text-emerald-400 font-semibold">{countdown}s</span>…
                  </p>
                </div>

                <Button className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                  <Icon name="dashboard" size={15} />
                  Go to Dashboard Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
              <div className="h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-600" />
              <div className="p-8 text-center">
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-center justify-center">
                    <Icon name="error" size={38} className="text-red-400" />
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  {errorMsg || 'This activation link is invalid or has expired.'}
                </p>
                <p className="text-xs text-gray-600 mb-6">
                  Activation links expire after 24 hours.
                </p>

                <div className="space-y-3">
                  {emailParam ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={handleResend}
                        loading={resending}
                        disabled={resendCooldown > 0}
                      >
                        <Icon name="send" size={15} />
                        {resent
                          ? `Sent! (${resendCooldown}s)`
                          : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend Activation Email'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        {emailParam && <span>Sending to <span className="text-gray-300">{emailParam}</span></span>}
                      </p>
                    </>
                  ) : (
                    <Link to="/signup">
                      <Button className="w-full">
                        <Icon name="person_add" size={15} />
                        Create a New Account
                      </Button>
                    </Link>
                  )}
                  <Link to="/login" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors py-1">
                    Already verified? Sign in
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
