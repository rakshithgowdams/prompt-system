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
    'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl overflow-hidden ' +
    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95';

  const variants = {
    primary:  'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white focus:ring-blue-500 shadow-lg shadow-blue-900/30',
    secondary:'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-100 focus:ring-gray-500',
    ghost:    'hover:bg-gray-800 active:bg-gray-700 text-gray-300 hover:text-white focus:ring-gray-500',
    danger:   'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white focus:ring-red-500 shadow-lg shadow-red-900/30',
    outline:  'border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
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
      {/* Ripple effects */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/20 pointer-events-none animate-[ripple_0.6s_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      {/* Spinner */}
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
