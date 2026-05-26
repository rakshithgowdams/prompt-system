import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string({ error: 'Please confirm your password' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

// ── Check-your-email screen ───────────────────────────────────────────────────

function CheckEmailScreen({ email, onResend }: { email: string; onResend: () => void }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setResending(false);
    setResent(true);
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setResent(false); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="w-full max-w-sm"
    >
      {/* Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600" />

        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-500/10 border-2 border-blue-500/30 rounded-3xl flex items-center justify-center">
                <Icon name="mark_email_unread" size={36} className="text-blue-400" />
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              We've sent an activation link to
            </p>
            <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl">
              <Icon name="email" size={15} className="text-blue-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white break-all">{email}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {[
              { icon: 'inbox',        text: 'Open your email inbox' },
              { icon: 'search',       text: 'Check Promotions or Spam if not in inbox' },
              { icon: 'verified',     text: 'Click the activation link in the email' },
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
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-3">Didn't receive it?</p>
            {resent ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-emerald-400"
              >
                <Icon name="check_circle" size={15} />
                Resent! Check your inbox.
                {countdown > 0 && <span className="text-gray-500 text-xs">({countdown}s)</span>}
              </motion.div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {resending ? 'Sending…' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend activation email'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="mt-5 p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
        <Icon name="info" size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          The link expires in <span className="font-semibold">24 hours</span>. If you can't find the email, check your{' '}
          <span className="text-amber-300 font-medium">Spam</span> or{' '}
          <span className="text-amber-300 font-medium">Promotions</span> folder.
        </p>
      </div>

      <p className="text-center text-sm text-gray-600 mt-5">
        Wrong email?{' '}
        <Link to="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
          Start over
        </Link>
      </p>
    </motion.div>
  );
}

// ── Main signup form ──────────────────────────────────────────────────────────

export function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const doSignUp = async (email: string, password: string) => {
    const redirectTo = `${window.location.origin}/verify-email`;
    return supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
  };

  const onSubmit = async (data: FormData) => {
    const { error } = await doSignUp(data.email, data.password);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmittedEmail(data.email);
    setSubmitted(true);
  };

  const handleResend = async () => {
    const email = submittedEmail || getValues('email');
    const password = getValues('password');
    const { error } = await doSignUp(email, password);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {submitted ? (
          <CheckEmailScreen
            key="check-email"
            email={submittedEmail}
            onResend={handleResend}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">Create Account</h1>
              <p className="text-gray-400 text-sm mt-1">Start managing your AI prompts</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                autoComplete="email"
                {...register('email')}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  error={errors.password?.message}
                  autoComplete="new-password"
                  className="pr-12"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 bottom-0 h-11 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <Icon name={showPw ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                error={errors.confirmPassword?.message}
                autoComplete="new-password"
                {...register('confirmPassword')}
              />

              {/* Password strength hint */}
              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                <Icon name="shield" size={12} />
                Use a mix of letters, numbers, and symbols for a strong password
              </p>

              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>

            <p className="text-center text-[11px] text-gray-600 mt-5">
              Developed by{' '}
              <a
                href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400/70 hover:text-pink-300 font-semibold transition-colors"
              >
                @aiwithrakshith
              </a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
