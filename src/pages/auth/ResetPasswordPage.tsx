import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const schema = z.object({
  password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string({ error: 'Please confirm your password' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type PageState = 'loading' | 'ready' | 'invalid' | 'done';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setPageState('invalid');
      return;
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) { setPageState('invalid'); return; }
      setRecoveryToken(accessToken);
      window.history.replaceState(null, '', window.location.pathname);
      setPageState('ready');
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!recoveryToken) {
      toast.error('Invalid or expired reset link. Please request a new one.');
      setPageState('invalid');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) { toast.error(error.message); return; }

    await supabase.auth.signOut();
    setRecoveryToken(null);
    setPageState('done');
    setTimeout(() => navigate('/login'), 2500);
  };

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm text-center">
          {children}
        </div>
      </div>
    </div>
  );

  if (pageState === 'loading') return wrapper(
    <div className="space-y-4">
      <div className="w-10 h-10 mx-auto border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-ink-500 text-sm">Verifying your reset link…</p>
    </div>
  );

  if (pageState === 'invalid') return wrapper(
    <div className="space-y-5">
      <div className="w-14 h-14 mx-auto bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
        <Icon name="link_off" size={28} className="text-danger" />
      </div>
      <div>
        <p className="text-ink-900 font-extrabold text-lg">Link invalid or expired</p>
        <p className="text-ink-500 text-sm mt-1">
          This reset link has already been used or has expired. Please request a new one.
        </p>
      </div>
      <Button variant="primary" onClick={() => navigate('/forgot-password')}>
        <Icon name="refresh" size={15} />
        Request new link
      </Button>
    </div>
  );

  if (pageState === 'done') return wrapper(
    <div className="space-y-4">
      <div className="w-14 h-14 mx-auto bg-green-50 border border-green-200 rounded-md flex items-center justify-center">
        <Icon name="check_circle" size={28} className="text-success" />
      </div>
      <p className="text-ink-900 font-extrabold">Password updated!</p>
      <p className="text-ink-500 text-sm">Redirecting you to login…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
              <Icon name="lock_reset" size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink-900">Set New Password</h1>
            <p className="text-ink-500 text-sm mt-1">Choose a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              autoComplete="new-password"
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your new password"
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            <Button type="submit" variant="primary" className="w-full" size="lg" loading={isSubmitting}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
