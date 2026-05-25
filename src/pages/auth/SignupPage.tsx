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
  password: z.string({ error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string({ error: 'Please confirm your password' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export function SignupPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Account created! Signing you in...');
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (loginError) {
      navigate('/login');
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
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Start managing your AI prompts</p>
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
              className="absolute right-3 bottom-0 h-11 text-gray-400 hover:text-gray-200"
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

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
