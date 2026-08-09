'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const button = cva(
  // Subtle, fast press feedback; 44px min height meets the AA tap-target rule.
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-fast ease-standard active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
        secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200',
        /** Neutral bordered button — the default for secondary table/row actions. */
        outline:
          'border border-line-strong bg-surface-card text-neutral-700 hover:bg-surface-raised hover:text-neutral-900 active:bg-surface-sunken',
        ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
        /** Quiet neutral action that should not compete with anything. */
        subtle:
          'bg-transparent text-muted-foreground hover:bg-surface-raised hover:text-neutral-900',
        danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-500 active:bg-danger-700',
        'danger-outline':
          'border border-danger-500/30 bg-surface-card text-danger-600 hover:bg-danger-50',
      },
      size: {
        sm: 'h-[2.25rem] px-3 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-12 px-6 text-base',
        /** Square icon-only button; pair with an aria-label. */
        icon: 'h-11 w-11 shrink-0 p-0',
        'icon-sm': 'h-[2.25rem] w-[2.25rem] shrink-0 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  loading?: boolean | undefined;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}
