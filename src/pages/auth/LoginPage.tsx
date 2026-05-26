import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
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
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
              <Icon name="bolt" size={24} className="text-white" fill />
            </div>
            <h1 className="text-2xl font-extrabold text-ink-900">aiwithrakshith.tech</h1>
            <p className="text-ink-500 text-sm mt-1">Sign in to your account</p>
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
