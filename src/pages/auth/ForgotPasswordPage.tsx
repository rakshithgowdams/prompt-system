import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ink-300 rounded-lg p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-brand-50 border border-brand-100 rounded-md flex items-center justify-center">
                <Icon name="mark_email_read" size={28} className="text-brand-400" />
              </div>
              <h2 className="text-xl font-extrabold text-ink-900">Check your inbox</h2>
              <p className="text-ink-500 text-sm">We've sent a password reset link to your email address.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-500 text-sm font-medium transition-colors"
              >
                <Icon name="arrow_back" size={15} />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-400 rounded-md mb-4">
                  <Icon name="bolt" size={24} className="text-white" fill />
                </div>
                <h1 className="text-2xl font-extrabold text-ink-900">Reset Password</h1>
                <p className="text-ink-500 text-sm mt-1">We'll send you a reset link</p>
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
                <Button type="submit" variant="primary" className="w-full" size="lg" loading={isSubmitting}>
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900 text-sm transition-colors"
                >
                  <Icon name="arrow_back" size={15} />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
