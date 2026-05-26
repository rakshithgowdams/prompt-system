import React from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';

interface StarRatingProps {
  rating: number;
  max?: number;
}

function StarRating({ rating, max = 5 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={filled ? '#E59819' : half ? 'url(#half)' : 'none'} stroke="#E59819" strokeWidth="1.5">
            {half && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#E59819" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}

interface MetaPill {
  icon?: string;
  label: string;
}

export interface ContentCardProps {
  thumbnail?: React.ReactNode;
  title: string;
  subtitle?: string;
  rating?: number;
  ratingCount?: number;
  metaPills?: MetaPill[];
  priceLabel?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
  aspectRatio?: string;
}

export function ContentCard({
  thumbnail,
  title,
  subtitle,
  rating,
  ratingCount,
  metaPills,
  priceLabel,
  badge,
  onClick,
  actions,
  className,
  aspectRatio = 'aspect-video',
}: ContentCardProps) {
  return (
    <article
      className={cn(
        'group bg-white border border-ink-300 rounded-lg overflow-hidden flex flex-col cursor-pointer',
        'transition-all duration-150 hover:shadow-card-hover hover:-translate-y-0.5',
        className,
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className={cn('relative bg-ink-100 overflow-hidden flex-shrink-0', aspectRatio)}>
        {thumbnail ?? (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="image" size={32} className="text-ink-300" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-bold text-ink-900 leading-snug line-clamp-2">{title}</h3>

        {subtitle && (
          <p className="text-xs text-ink-500 line-clamp-1">{subtitle}</p>
        )}

        {rating !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-rating">{rating.toFixed(1)}</span>
            <StarRating rating={rating} />
            {ratingCount !== undefined && (
              <span className="text-xs text-ink-500">({ratingCount})</span>
            )}
          </div>
        )}

        {metaPills && metaPills.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {metaPills.map((pill, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] text-ink-500">
                {pill.icon && <Icon name={pill.icon} size={11} className="text-ink-500" />}
                {pill.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          {priceLabel !== undefined && (
            <span className="text-sm font-extrabold text-ink-900">{priceLabel}</span>
          )}
          {badge && <span>{badge}</span>}
        </div>

        {actions && <div className="mt-2">{actions}</div>}
      </div>
    </article>
  );
}
