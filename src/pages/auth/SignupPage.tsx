import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string({ error: 'Please confirm your password' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

// ── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (i: number, ch: string) => {
    const cleaned = ch.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    onChange(next.join(''));
    if (cleaned && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6));
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={[
            'w-11 h-12 text-center text-xl font-bold rounded-md border transition-all outline-none',
            'bg-white text-ink-900',
            d ? 'border-brand-400 ring-1 ring-brand-400' : 'border-ink-300',
            'focus:border-brand-400 focus:ring-1 focus:ring-brand-400',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ── OTP Verification Screen ──────────────────────────────────────────────────

function OtpScreen({
  email,
  password,
  onBack,
}: {
  email: string;
  password: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCooldown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setResent(false); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setResent(true);
      setOtp('');
      startCooldown();
      toast.success('New code sent — check your inbox');
    } catch {
      toast.error('Failed to resend code. Try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) { toast.error('Enter the full 6-digit code'); return; }
    setVerifying(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Verification failed');
        return;
      }

      // Restore the JWT session from tokens returned by the Edge Function
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        toast.error('Failed to start session. Please log in.');
        navigate('/login', { replace: true });
        return;
      }

      toast.success('Account verified! Welcome.');
      navigate('/dashboard', { replace: true });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
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
          <p className="text-ink-500 text-sm">We sent a 6-digit code to</p>
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-ink-100 border border-ink-300 rounded-md">
            <Icon name="email" size={14} className="text-brand-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-ink-900 break-all">{email}</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-ink-500 text-center mb-3">Enter the 6-digit code</p>
          <OtpInput value={otp} onChange={setOtp} disabled={verifying} />
        </div>

        <Button
          variant="primary"
          className="w-full"
          size="lg"
          loading={verifying}
          onClick={handleVerify}
          disabled={otp.length < 6}
        >
          <Icon name="verified" size={16} />
          Verify &amp; Create Account
        </Button>

        <div className="mt-5 text-center space-y-2">
          <p className="text-xs text-ink-500">Didn't receive it? Check Spam or Promotions.</p>
          {resent ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5 text-sm text-green-600"
            >
              <Icon name="check_circle" size={14} />
              Sent! {countdown > 0 && <span className="text-ink-500 text-xs">({countdown}s)</span>}
            </motion.p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-sm text-brand-400 hover:text-brand-500 disabled:text-ink-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {resending ? 'Sending…' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
        <Icon name="info" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          This code expires in <span className="font-semibold">10 minutes</span>.
        </p>
      </div>

      <p className="text-center text-sm text-ink-500 mt-4">
        Wrong email?{' '}
        <button onClick={onBack} className="text-brand-400 hover:text-brand-500 transition-colors font-medium">
          Go back
        </button>
      </p>
    </motion.div>
  );
}

// ── Signup Form ──────────────────────────────────────────────────────────────

export function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error ?? 'Failed to send verification code');
      return;
    }
    setSubmittedEmail(data.email);
    setSubmittedPassword(data.password);
    setOtpSent(true);
  };

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {otpSent ? (
          <OtpScreen
            key="otp"
            email={submittedEmail}
            password={submittedPassword}
            onBack={() => setOtpSent(false)}
          />
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
                  <Icon name="send" size={16} />
                  Send Verification Code
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
