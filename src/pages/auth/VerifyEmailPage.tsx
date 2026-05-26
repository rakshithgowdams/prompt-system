import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

type VerifyState = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    // Supabase appends the token info as hash fragments or query params
    // onAuthStateChange fires with SIGNED_IN when the token is consumed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setState('success');
      }
    });

    // Also check if there's an error in the URL (Supabase appends error_description)
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
        if (session) {
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
  }, []);

  // Auto-redirect after success
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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">

      {/* Verifying */}
      {state === 'verifying' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
            <p className="text-white font-semibold text-lg">Verifying your email…</p>
            <p className="text-gray-500 text-sm mt-1">Just a moment, activating your account</p>
          </div>
        </motion.div>
      )}

      {/* Success */}
      {state === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="w-full max-w-sm"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            <div className="p-8 text-center">

              {/* Success icon */}
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

              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Your account is now active. Welcome to PromptVault!
              </p>

              {/* Progress bar + countdown */}
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
                  Redirecting to dashboard in <span className="text-emerald-400 font-semibold">{countdown}s</span>…
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

      {/* Error */}
      {state === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="w-full max-w-sm"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-600" />
            <div className="p-8 text-center">

              {/* Error icon */}
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-center justify-center">
                  <Icon name="error" size={38} className="text-red-400" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-2">
                {errorMsg || 'This activation link is invalid or has expired.'}
              </p>
              <p className="text-xs text-gray-600 mb-6">
                Activation links expire after 24 hours.
              </p>

              <div className="space-y-3">
                <Link to="/signup">
                  <Button className="w-full">
                    <Icon name="person_add" size={15} />
                    Create a New Account
                  </Button>
                </Link>
                <Link to="/login" className="block text-sm text-gray-500 hover:text-gray-300 transition-colors py-1">
                  Already verified? Sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
