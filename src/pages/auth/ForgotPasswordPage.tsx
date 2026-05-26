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
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-1">We'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
              <Icon name="mark_email_read" size={32} className="text-green-400" weight={300} />
            </div>
            <p className="text-white font-medium">Check your inbox</p>
            <p className="text-gray-400 text-sm">We've sent a password reset link to your email address.</p>
            <Link to="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium">
              <Icon name="arrow_back" size={15} />
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />
            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Send Reset Link
            </Button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors mt-2">
              <Icon name="arrow_back" size={15} />
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
