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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      className="w-full max-w-md"
    >
      <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-md flex items-center justify-center">
            <Icon name="mark_email_unread" size={32} className="text-brand-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-ink-900 mb-2">Check your inbox</h1>
          <p className="text-ink-500 text-sm">We've sent an activation link to</p>
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-ink-100 border border-ink-300 rounded-md">
            <Icon name="email" size={14} className="text-brand-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-ink-900 break-all">{email}</span>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {[
            { icon: 'inbox', text: 'Open your email inbox' },
            { icon: 'search', text: 'Check Promotions or Spam if not in inbox' },
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

        <div className="text-center">
          <p className="text-xs text-ink-500 mb-3">Didn't receive it?</p>
          {resent ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-sm text-success"
            >
              <Icon name="check_circle" size={15} />
              Resent! Check your inbox.
              {countdown > 0 && <span className="text-ink-500 text-xs">({countdown}s)</span>}
            </motion.div>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-sm text-brand-400 hover:text-brand-500 disabled:text-ink-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {resending ? 'Sending…' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend activation email'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
        <Icon name="info" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          The link expires in <span className="font-semibold">24 hours</span>. If you can't find the email, check your{' '}
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
  );
}

export function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const doSignUp = async (email: string, password: string) => {
    const redirectTo = `${window.location.origin}/verify-email`;
    return supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
  };

  const onSubmit = async (data: FormData) => {
    const { error } = await doSignUp(data.email, data.password);
    if (error) { toast.error(error.message); return; }
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
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {submitted ? (
          <CheckEmailScreen key="check-email" email={submittedEmail} onResend={handleResend} />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md"
          >
            <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
                  <Icon name="bolt" size={24} className="text-white" fill />
                </div>
                <h1 className="text-2xl font-extrabold text-ink-900">Create Account</h1>
                <p className="text-ink-500 text-sm mt-1">Start managing your AI prompts</p>
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
                    className="absolute right-3 bottom-0 h-11 text-ink-500 hover:text-ink-900 transition-colors"
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

                <Button type="submit" variant="primary" className="w-full" size="lg" loading={isSubmitting}>
                  Create Account
                </Button>
              </form>

              <p className="text-center text-sm text-ink-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-400 hover:text-brand-500 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <p className="text-center text-[11px] text-ink-500 mt-6">
              Developed by{' '}
              <a
                href="https://www.instagram.com/aiwithrakshith?igsh=anAxYmJrdWhsODFj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-500 font-semibold transition-colors"
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
