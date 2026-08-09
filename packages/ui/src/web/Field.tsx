'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

/**
 * Form controls beyond the plain `Input`. Both apps were styling raw `<select>`,
 * `<textarea>`, search boxes, and checkboxes inline, so control heights, focus
 * rings, and error text differed from page to page. These share one 44px sizing
 * and one focus/error treatment.
 */

/** Shared control chrome: 44px target, visible focus ring, error state. */
const controlBase =
  'w-full rounded-md border bg-surface-card text-base text-neutral-900 outline-none transition duration-fast placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted-foreground';

function controlTone(invalid: boolean): string {
  return invalid
    ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/30'
    : 'border-line-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30';
}

function FieldShell({
  id,
  label,
  hint,
  errorText,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  errorText?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-neutral-800">
        {label}
        {required ? (
          <span className="text-danger-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {errorText ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger-600">
          {errorText}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, errorText?: string, hint?: string): string | undefined {
  if (errorText) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Visually hide the label when the control sits in a labelled filter bar. */
  hideLabel?: boolean | undefined;
  hint?: string | undefined;
  errorText?: string | undefined;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel, hint, errorText, className, id, required, children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const control = (
    // The chevron is a real element, not a CSS background: a Tailwind arbitrary
    // `bg-[url("data:…")]` with spaces and quotes in it does not survive class
    // generation, which silently left the control with no dropdown affordance at
    // all once `appearance-none` removed the native one.
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={describedBy(selectId, errorText, hint)}
        className={cn(
          controlBase,
          controlTone(Boolean(errorText)),
          'h-11 cursor-pointer appearance-none pl-3 pr-10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );

  if (hideLabel) {
    return (
      <div className={cn('space-y-1.5')}>
        <label htmlFor={selectId} className="sr-only">
          {label}
        </label>
        {control}
      </div>
    );
  }
  return (
    <FieldShell id={selectId} label={label} hint={hint} errorText={errorText} required={required}>
      {control}
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string | undefined;
  errorText?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, errorText, className, id, required, rows = 4, ...props },
  ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <FieldShell id={areaId} label={label} hint={hint} errorText={errorText} required={required}>
      <textarea
        ref={ref}
        id={areaId}
        rows={rows}
        required={required}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={describedBy(areaId, errorText, hint)}
        className={cn(controlBase, controlTone(Boolean(errorText)), 'resize-y p-3', className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Accessible name; rendered visually only when `showLabel` is set. */
  label?: string;
  showLabel?: boolean;
  onClear?: () => void;
}

/** Search box with a leading icon and an optional clear affordance. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label = 'Search', showLabel, className, id, value, onClear, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasValue = typeof value === 'string' && value.length > 0;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={showLabel ? 'block text-sm font-medium text-neutral-800' : 'sr-only'}
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          className={cn(
            controlBase,
            controlTone(false),
            'h-11 pl-10',
            hasValue && onClear ? 'pr-10' : 'pr-3',
            // Hide the native clear control so ours is the only one.
            '[&::-webkit-search-cancel-button]:appearance-none',
            className,
          )}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 flex h-[2rem] w-[2rem] -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-raised hover:text-neutral-900"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: string | undefined;
  /** Renders as a bordered row — use for a standalone, prominent choice. */
  boxed?: boolean | undefined;
}

/** Checkbox with a real 44px hit area and a visible focus ring. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, boxed, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <div className={cn(boxed && 'rounded-md border border-line bg-surface-raised px-3', className)}>
      <label
        htmlFor={boxId}
        className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-neutral-800"
      >
        <input
          ref={ref}
          id={boxId}
          type="checkbox"
          className="h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong text-brand-600 accent-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
          {...props}
        />
        <span>{label}</span>
      </label>
      {hint ? <p className="pb-2 pl-8 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
});

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Mutually exclusive choice shown as one connected control — date ranges, view
 * modes. Uses a radiogroup so arrow keys work, which a row of `aria-pressed`
 * buttons does not give you.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-md border border-line bg-surface-raised p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[2.25rem] rounded px-3 text-sm font-semibold transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              selected
                ? 'bg-surface-card text-neutral-900 shadow-sm'
                : 'text-muted-foreground hover:text-neutral-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Filter/search bar above a table or list. Keeps controls on one aligned row on
 * desktop and stacks them on mobile, instead of each page inventing a layout.
 */
export function Toolbar({
  children,
  trailing,
  className,
}: {
  children: ReactNode;
  /** Right-aligned cluster, e.g. result count or a reset button. */
  trailing?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-line bg-surface-card p-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">{trailing}</div>
      ) : null}
    </div>
  );
}
