'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // Allow explicit `undefined` (callers commonly pass an optional error value).
  errorText?: string | undefined;
  hint?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, errorText, hint, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = errorText ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-md border bg-white px-3 text-base text-neutral-900 outline-none transition duration-fast placeholder:text-neutral-400 focus:ring-1',
          errorText
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
            : 'border-neutral-300 focus:border-brand-500 focus:ring-brand-500',
          className,
        )}
        {...props}
      />
      {errorText ? (
        <p id={`${inputId}-error`} className="text-xs text-danger-600">
          {errorText}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
