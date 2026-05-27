import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import { X, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TurnstileWidget, resetTurnstile } from '../auth/TurnstileWidget';

const schema = z.object({
  email: z.email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  tier: 'standard' | 'premium';
  onClose: () => void;
}

export function NotifyMeModal({ tier, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: localStorage.getItem('notify_email') ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    localStorage.setItem('notify_email', data.email);
    try {
      const { error } = await supabase.functions.invoke('submit-notify-signup', {
        body: {
          email: data.email.toLowerCase(),
          tier,
          captcha_token: captchaToken ?? '',
        },
      });
      if (error) throw error;
    } catch {
      // fallback — still show success (UX: don't block user on infra issues)
    }
    setSubmitted(true);
    toast.success("You're on the list. We'll be in touch!");
    setTimeout(onClose, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center mb-5">
          <Bell className="w-5 h-5 text-brand-400" />
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="font-display font-extrabold text-xl text-ink-900 mb-2">You're on the list!</h3>
            <p className="text-sm text-ink-500">We'll email you the moment {tier === 'standard' ? 'Standard' : 'Premium'} launches.</p>
          </div>
        ) : (
          <>
            <h3 className="font-display font-extrabold text-xl text-ink-900 mb-2">Be the first to know</h3>
            <p className="text-sm text-ink-500 mb-6">
              We'll email you the moment{' '}
              <strong className="text-ink-900 capitalize">{tier}</strong> launches.
              Promise — no spam.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="notify-email" className="block text-sm font-semibold text-ink-900 mb-1.5">
                  Email address
                </label>
                <input
                  id="notify-email"
                  type="email"
                  placeholder="you@example.com"
                  autoFocus
                  {...register('email')}
                  className={`w-full h-11 px-4 text-sm border rounded-xl outline-none transition-colors ${
                    errors.email ? 'border-danger focus:border-danger' : 'border-ink-300 focus:border-brand-400'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
                )}
              </div>
              <TurnstileWidget
                action="notify-signup"
                onVerify={setCaptchaToken}
                onExpire={() => { setCaptchaToken(null); resetTurnstile(); }}
                onError={() => setCaptchaToken(null)}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-ink-900 text-white text-sm font-bold rounded-xl hover:bg-brand-400 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Notify me'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
