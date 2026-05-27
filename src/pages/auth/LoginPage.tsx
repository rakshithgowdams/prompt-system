import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { getRecaptchaToken } from '../../lib/recaptcha';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

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

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // reCAPTCHA v3 — get token and verify server-side before proceeding
    const recaptchaToken = await getRecaptchaToken('login');
    if (recaptchaToken) {
      const rcRes = await fetch(`${supabaseUrl}/functions/v1/verify-recaptcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ token: recaptchaToken, action: 'login' }),
      }).catch(() => null);
      if (rcRes) {
        const rcData = await rcRes.json().catch(() => ({}));
        if (!rcRes.ok || !rcData.success) {
          toast.error('Security check failed. Please try again.');
          return;
        }
      }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const msg = error.message.toLowerCase();

      // Unverified account — offer to re-send OTP
      if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        setSendingOtp(true);
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email }),
          });
          if (res.ok) {
            toast.info('Account not verified — a new code has been sent to your inbox.');
            navigate(
              `/verify-email?email=${encodeURIComponent(data.email)}&pending=1`,
              { replace: false }
            );
          } else {
            toast.error('Email not confirmed. Please sign up again.');
          }
        } catch {
          toast.error('Email not confirmed. Please sign up again.');
        } finally {
          setSendingOtp(false);
        }
        return;
      }

      toast.error(error.message);
      return;
    }

    // JWT session is set automatically by the Supabase client
    if (authData.session) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-3 mb-2">
              <img src="/aiwithrakshith-tech-logo.png" alt="aiwithrakshith.tech" className="h-14 w-14 object-contain" />
              <h1 className="font-display font-black text-ink-900 tracking-tight leading-none" style={{ fontSize: '22px', letterSpacing: '-0.03em' }}>aiwithrakshith</h1>
            </div>
            <p className="text-sm text-ink-500 mt-1 font-sans">Sign in to your account</p>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={async () => { setGoogleLoading(true); await signInWithGoogle(); setGoogleLoading(false); }}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-11 border border-ink-300 rounded-xl bg-white hover:bg-ink-50 hover:border-ink-500 transition-all text-sm font-semibold text-ink-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-ink-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-ink-200" />
            <span className="text-xs text-ink-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-ink-200" />
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
                placeholder="••••••••"
                error={errors.password?.message}
                autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-ink-300 text-brand-400 focus:ring-brand-400"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-ink-700">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-500 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              loading={isSubmitting || sendingOtp}
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-500 font-medium transition-colors">
              Create one
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
      </div>
    </div>
  );
}
