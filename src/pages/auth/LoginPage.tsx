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

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      // Email not confirmed — redirect to the verify page with their email so they can resend
      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('email_not_confirmed')
      ) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}&pending=1`, { replace: false });
        return;
      }
      toast.error(error.message);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
            <Icon name="lock" size={28} className="text-white" weight={400} fill />
          </div>
          <h1 className="text-2xl font-bold text-white">aiwithrakshith.tech</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
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
              className="absolute right-3 bottom-0 h-11 text-gray-400 hover:text-gray-200"
            >
              <Icon name={showPw ? 'visibility_off' : 'visibility'} size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                {...register('rememberMe')}
              />
              <span className="text-sm text-gray-400">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Create one
          </Link>
        </p>

        <p className="text-center text-[11px] text-gray-600 mt-8">
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
      </div>
    </div>
  );
}
