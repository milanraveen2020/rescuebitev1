import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badge = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'border-neutral-200 bg-neutral-100 text-neutral-700',
        brand: 'border-brand-200 bg-brand-50 text-brand-800',
        accent: 'border-accent-100 bg-accent-50 text-accent-700',
        danger: 'border-danger-100 bg-danger-50 text-danger-700',
        success: 'border-success-100 bg-success-50 text-success-700',
        warning: 'border-warning-100 bg-warning-50 text-warning-700',
        info: 'border-info-100 bg-info-50 text-info-700',
      },
      /** Adds a leading status dot — helps statuses read at a glance in tables. */
      dot: { true: '', false: '' },
    },
    defaultVariants: { tone: 'neutral', dot: false },
  },
);

const DOT_TONE = {
  neutral: 'bg-neutral-400',
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  danger: 'bg-danger-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badge({ tone, dot }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONE[tone ?? 'neutral'])}
        />
      ) : null}
      {children}
    </span>
  );
}
