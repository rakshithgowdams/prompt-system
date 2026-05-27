import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { TurnstileWidget, resetTurnstile } from '../../components/auth/TurnstileWidget';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

const schema = z.object({
  email: z.string({ error: 'Email is required' }).email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!captchaToken) {
      toast.error('Please complete the security check.');
      return;
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, captcha_token: captchaToken }),
      });
      const json = await res.json();
      if (!res.ok && json.error) {
        toast.error(json.error);
        resetTurnstile();
        setCaptchaToken(null);
        return;
      }
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
      resetTurnstile();
      setCaptchaToken(null);
    }
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
              <h2 className="text-xl font-display font-extrabold text-ink-900 tracking-tight">Check your inbox</h2>
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
                <div className="flex flex-col items-center gap-3 mb-2">
                  <img src="/aiwithrakshith-tech-logo.webp" alt="aiwithrakshith.tech" className="h-14 w-14 object-contain" />
                  <span className="font-display font-black text-ink-900 tracking-tight leading-none" style={{ fontSize: '22px', letterSpacing: '-0.03em' }}>aiwithrakshith</span>
                </div>
                <h1 className="text-2xl font-display font-extrabold text-ink-900 tracking-tight">Reset Password</h1>
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
                <TurnstileWidget
                  action="forgot-password"
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  className="flex justify-center"
                />
                <Button type="submit" variant="primary" className="w-full" size="lg" loading={isSubmitting} disabled={!captchaToken}>
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
