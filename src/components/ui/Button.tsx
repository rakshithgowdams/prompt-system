import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface RippleItem { id: number; x: number; y: number; size: number }

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const sz = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - sz / 2;
      const y = e.clientY - rect.top - sz / 2;
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x, y, size: sz }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    }
    onClick?.(e);
  };

  const base =
    'relative inline-flex items-center justify-center gap-2 font-bold rounded-md overflow-hidden ' +
    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:   'bg-brand-400 hover:bg-brand-500 text-white',
    secondary: 'bg-ink-900 hover:bg-ink-700 text-white',
    ghost:     'bg-transparent hover:bg-ink-100 text-ink-900 font-medium',
    danger:    'bg-danger hover:bg-danger/90 text-white',
    outline:   'bg-white border-2 border-ink-900 text-ink-900 hover:bg-ink-100',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/20 pointer-events-none animate-[ripple_0.6s_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      {loading && (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}

      {children}
    </button>
  );
}
