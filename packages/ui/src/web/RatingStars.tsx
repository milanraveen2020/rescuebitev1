'use client';

import { cn } from './cn';

export interface RatingStarsProps {
  value: number;
  /** When set, stars become interactive buttons calling this with 1–5. */
  onChange?: (rating: number) => void;
  size?: number;
  className?: string;
}

/** Read-only (or interactive) 5-star rating. */
export function RatingStars({ value, onChange, size = 18, className }: RatingStarsProps) {
  const interactive = typeof onChange === 'function';
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const Star = (
          <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
            <path
              fill={filled ? '#f79009' : '#e4e7ec'}
              d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
            />
          </svg>
        );
        return interactive ? (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            aria-checked={star === Math.round(value)}
            role="radio"
            onClick={() => onChange?.(star)}
            className="p-1"
          >
            {Star}
          </button>
        ) : (
          <span key={star}>{Star}</span>
        );
      })}
    </div>
  );
}
