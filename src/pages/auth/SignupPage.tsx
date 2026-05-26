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
import { PolicyModal, type PolicyType } from '../../components/legal/PolicyModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string({ error: 'Please confirm your password' }),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Terms, Privacy Policy, and Refund Policy to continue',
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

// ── OTP Input ─────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const raw = value.split('').slice(0, 6);
  const digits = Array.from({ length: 6 }, (_, i) => raw[i] ?? '');

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
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    // Use rAF so the input values have updated before we move focus
    requestAnimationFrame(() => inputRefs.current[focusIdx]?.focus());
  };

  return (
    <div className="flex gap-2 justify-center">
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
          onPaste={handlePaste}
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

// ── OTP Verification Screen ───────────────────────────────────────────────────

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
          <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight mb-2">Check your inbox</h1>
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

// ── Signup Form ───────────────────────────────────────────────────────────────

export function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');
  const [openPolicy, setOpenPolicy] = useState<PolicyType | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { acceptTerms: false },
  });

  const acceptTerms = watch('acceptTerms');

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
    <>
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
                  <div className="flex justify-center mb-4">
                    <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-16 w-auto" />
                  </div>
                  <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">Create Account</h1>
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

                  {/* ── Accept Terms ─────────────────────────────────── */}
                  <div className="space-y-1.5">
                    <label
                      className={[
                        'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                        acceptTerms
                          ? 'bg-brand-50 border-brand-400'
                          : 'bg-ink-100 border-ink-300 hover:border-ink-500',
                        errors.acceptTerms ? 'border-danger ring-2 ring-danger/20' : '',
                      ].join(' ')}
                    >
                      <div className="relative flex-shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          className="sr-only"
                          {...register('acceptTerms')}
                        />
                        <div
                          className={[
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            acceptTerms
                              ? 'bg-brand-400 border-brand-400'
                              : 'bg-white border-ink-300',
                          ].join(' ')}
                        >
                          {acceptTerms && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <Icon name="check" size={12} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-ink-700 leading-relaxed">
                        I have read and agree to the{' '}
                        <PolicyLink label="Terms of Service" onClick={() => setOpenPolicy('terms')} />,{' '}
                        <PolicyLink label="Privacy Policy" onClick={() => setOpenPolicy('privacy')} />, and{' '}
                        <PolicyLink label="Refund Policy" onClick={() => setOpenPolicy('refund')} />.
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <p className="text-xs text-danger flex items-center gap-1">
                        <Icon name="error" size={12} />
                        {errors.acceptTerms.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    size="lg"
                    loading={isSubmitting}
                  >
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

              {/* Policy quick-links row */}
              <div className="flex items-center justify-center gap-4 mt-4">
                {[
                  { label: 'Terms', type: 'terms' as PolicyType },
                  { label: 'Privacy', type: 'privacy' as PolicyType },
                  { label: 'Refund', type: 'refund' as PolicyType },
                ].map(({ label, type }) => (
                  <button
                    key={type}
                    onClick={() => setOpenPolicy(type)}
                    className="text-[11px] text-ink-500 hover:text-brand-400 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] text-ink-500 mt-3">
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

      {/* Policy modal — rendered outside the card so it overlays correctly */}
      <PolicyModal
        type={openPolicy}
        onClose={() => setOpenPolicy(null)}
        onAccept={() => setValue('acceptTerms', true, { shouldValidate: true })}
      />
    </>
  );
}

// ── Inline link helper ────────────────────────────────────────────────────────
function PolicyLink({ label, onClick }: { label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className="text-brand-400 hover:text-brand-500 font-medium underline underline-offset-2 transition-colors"
    >
      {label}
    </button>
  );
}
