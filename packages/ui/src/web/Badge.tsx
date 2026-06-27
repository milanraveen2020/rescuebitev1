import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badge = cva(
  'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-100 text-neutral-700',
        brand: 'bg-brand-100 text-brand-800',
        accent: 'bg-accent-100 text-accent-700',
        danger: 'bg-danger-50 text-danger-600',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
