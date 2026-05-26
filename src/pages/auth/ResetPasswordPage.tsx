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
  // Store the recovery access token so we can use it for the update
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // Parse the URL hash that Supabase appends to the redirect URL:
    // #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setPageState('invalid');
      return;
    }

    // Exchange the tokens to create a valid session scoped to this recovery
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setPageState('invalid');
        return;
      }
      setRecoveryToken(accessToken);
      // Strip the tokens from the URL so the link can't be reused by copy-pasting
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

    if (error) {
      toast.error(error.message);
      return;
    }

    // Immediately sign out to invalidate the recovery session so the same
    // link / token cannot be used again
    await supabase.auth.signOut();
    setRecoveryToken(null);
    setPageState('done');

    setTimeout(() => navigate('/login'), 2500);
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <Icon name="link_off" size={32} className="text-red-400" weight={300} />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Link invalid or expired</p>
            <p className="text-gray-400 text-sm mt-1">
              This reset link has already been used or has expired. Please request a new one.
            </p>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Icon name="refresh" size={15} />
            Request new link
          </button>
        </div>
      </div>
    );
  }

  if (pageState === 'done') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <Icon name="check_circle" size={32} className="text-green-400" weight={300} />
          </div>
          <p className="text-white font-medium">Password updated!</p>
          <p className="text-gray-400 text-sm">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
            <Icon name="lock_reset" size={28} className="text-white" weight={400} />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account</p>
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
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
