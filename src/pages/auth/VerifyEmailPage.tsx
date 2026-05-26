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

  useEffect(() => {
    if (isPending) return;

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

  useEffect(() => {
    if (state !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); navigate('/dashboard', { replace: true }); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, navigate]);

  const handleResend = async () => {
    if (!emailParam) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: emailParam });
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
      // silently ignore rate-limit errors
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">

        {state === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="w-full max-w-md"
          >
            <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 bg-brand-50 border border-brand-100 rounded-md flex items-center justify-center">
                  <Icon name="mark_email_unread" size={28} className="text-brand-400" />
                </div>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-ink-900 mb-2">Activate your account</h1>
                <p className="text-ink-500 text-sm">We sent an activation link to</p>
                {emailParam && (
                  <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-ink-100 border border-ink-300 rounded-md">
                    <Icon name="email" size={14} className="text-brand-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-ink-900 break-all">{emailParam}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { icon: 'inbox', text: 'Open your email inbox' },
                  { icon: 'search', text: 'Check Spam or Promotions if missing' },
                  { icon: 'verified', text: 'Click the activation link in the email' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-ink-100 rounded-md border border-ink-300">
                    <div className="w-7 h-7 rounded-md bg-white border border-ink-300 flex items-center justify-center flex-shrink-0">
                      <Icon name={step.icon} size={14} className="text-ink-700" />
                    </div>
                    <p className="text-sm text-ink-700">{step.text}</p>
                  </div>
                ))}
              </div>

              {emailParam && (
                <div className="text-center">
                  <p className="text-xs text-ink-500 mb-3">Didn't receive it?</p>
                  {resent ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-sm text-success"
                    >
                      <Icon name="check_circle" size={15} />
                      Sent! Check your inbox.
                      {resendCooldown > 0 && <span className="text-ink-500 text-xs">({resendCooldown}s)</span>}
                    </motion.div>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resending || resendCooldown > 0}
                      className="text-sm text-brand-400 hover:text-brand-500 disabled:text-ink-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend activation email'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
              <Icon name="info" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                The link expires in <span className="font-semibold">24 hours</span>.
                If you can't find the email, check your{' '}
                <span className="font-medium">Spam</span> or <span className="font-medium">Promotions</span> folder.
              </p>
            </div>

            <p className="text-center text-sm text-ink-500 mt-4">
              Wrong email?{' '}
              <Link to="/signup" className="text-brand-400 hover:text-brand-500 transition-colors font-medium">
                Start over
              </Link>
            </p>
          </motion.div>
        )}

        {state === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-5"
          >
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 border-2 border-ink-300 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-ink-900 font-extrabold text-lg">Activating your account…</p>
              <p className="text-ink-500 text-sm mt-1">Just a moment, verifying your email</p>
            </div>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="w-full max-w-md"
          >
            <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto bg-green-50 border border-green-200 rounded-md flex items-center justify-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <Icon name="verified" size={28} className="text-success" fill />
                </motion.div>
              </div>

              <h1 className="text-2xl font-extrabold text-ink-900 mb-2">Account Activated!</h1>
              <p className="text-ink-500 text-sm leading-relaxed mb-6">
                Your email is verified. Welcome to aiwithrakshith.tech!
              </p>

              <div className="mb-5">
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-brand-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 4, ease: 'linear' }}
                  />
                </div>
                <p className="text-xs text-ink-500">
                  Redirecting in <span className="text-brand-400 font-semibold">{countdown}s</span>…
                </p>
              </div>

              <Button variant="primary" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
                <Icon name="dashboard" size={15} />
                Go to Dashboard Now
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            className="w-full max-w-md"
          >
            <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto bg-red-50 border border-red-200 rounded-md flex items-center justify-center mb-6">
                <Icon name="error" size={28} className="text-danger" />
              </div>

              <h1 className="text-2xl font-extrabold text-ink-900 mb-2">Link Expired</h1>
              <p className="text-ink-500 text-sm leading-relaxed mb-2">
                {errorMsg || 'This activation link is invalid or has expired.'}
              </p>
              <p className="text-xs text-ink-300 mb-6">Activation links expire after 24 hours.</p>

              <div className="space-y-3">
                {emailParam ? (
                  <>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleResend}
                      loading={resending}
                      disabled={resendCooldown > 0}
                    >
                      <Icon name="send" size={15} />
                      {resent ? `Sent! (${resendCooldown}s)` : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Activation Email'}
                    </Button>
                    {emailParam && (
                      <p className="text-xs text-ink-500">
                        Sending to <span className="text-ink-900 font-medium">{emailParam}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <Link to="/signup">
                    <Button variant="primary" className="w-full">
                      <Icon name="person_add" size={15} />
                      Create a New Account
                    </Button>
                  </Link>
                )}
                <Link to="/login" className="block text-sm text-ink-500 hover:text-ink-900 transition-colors py-1">
                  Already verified? Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
