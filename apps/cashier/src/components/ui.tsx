'use client';

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/** ---- Button ---------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm',
  secondary: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
  ghost: 'bg-transparent text-brand-800 hover:bg-brand-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-sm',
  outline: 'border border-neutral-300 bg-surface-card text-neutral-800 hover:bg-surface-raised',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-3 text-sm rounded-md gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-lg gap-2',
  lg: 'h-14 px-6 text-base rounded-xl gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  block?: boolean | undefined;
  loading?: boolean | undefined;
  leftIcon?: ReactNode | undefined;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    block,
    loading,
    leftIcon,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        'tap inline-flex select-none items-center justify-center font-semibold transition duration-200 ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
});

/** ---- Card ------------------------------------------------------------ */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-black/[0.05] bg-surface-card shadow-card', className)}
      {...props}
    />
  );
}

/** ---- Input ----------------------------------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  leftIcon?: ReactNode | undefined;
  rightSlot?: ReactNode | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, error, hint, leftIcon, rightSlot, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={cn('block text-sm font-semibold text-neutral-700', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full rounded-lg border bg-surface-card text-[15px] text-neutral-900 outline-none transition',
            'placeholder:text-neutral-400 focus:ring-2',
            leftIcon ? 'pl-10' : 'pl-3.5',
            rightSlot ? 'pr-12' : 'pr-3.5',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30'
              : 'border-neutral-300 focus:border-brand-500 focus:ring-brand-500/30',
            className,
          )}
          {...props}
        />
        {rightSlot ? (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** ---- Textarea -------------------------------------------------------- */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={areaId} className="block text-sm font-semibold text-neutral-700">
        {label}
      </label>
      <textarea
        ref={ref}
        id={areaId}
        className={cn(
          'w-full rounded-lg border border-neutral-300 bg-surface-card p-3.5 text-[15px] text-neutral-900 outline-none transition',
          'placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
          className,
        )}
        {...props}
      />
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
});
