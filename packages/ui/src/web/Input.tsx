'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // Allow explicit `undefined` (callers commonly pass an optional error value).
  errorText?: string | undefined;
  hint?: string | undefined;
  /** Visually hide the label when the control sits in a labelled filter bar. */
  hideLabel?: boolean | undefined;
  /** Leading adornment, e.g. a currency symbol or icon. */
  leading?: ReactNode | undefined;
  /** Trailing adornment, e.g. a unit or a toggle button. */
  trailing?: ReactNode | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, errorText, hint, hideLabel, leading, trailing, className, id, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = errorText ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={
          hideLabel ? 'sr-only' : 'flex items-center gap-1 text-sm font-medium text-neutral-800'
        }
      >
        {label}
        {required && !hideLabel ? (
          <span className="text-danger-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-md border bg-surface-card text-base text-neutral-900 outline-none transition duration-fast placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted-foreground',
            leading ? 'pl-8' : 'pl-3',
            trailing ? 'pr-12' : 'pr-3',
            errorText
              ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/30'
              : 'border-line-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
      {errorText ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-danger-600">
          {errorText}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
