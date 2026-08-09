'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label = 'Quantity',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => onChange(clamp(Number.isFinite(n) ? Math.round(n) : min));

  return (
    <div className="flex items-stretch gap-2" role="group" aria-label={label}>
      <StepButton label="Decrease quantity" onClick={() => set(value - 1)} disabled={value <= min}>
        <Minus className="h-5 w-5" aria-hidden />
      </StepButton>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => set(e.target.valueAsNumber)}
        className="h-14 w-full min-w-0 rounded-xl border border-neutral-300 bg-surface-card text-center font-display text-2xl font-extrabold text-neutral-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <StepButton label="Increase quantity" onClick={() => set(value + 1)} disabled={value >= max}>
        <Plus className="h-5 w-5" aria-hidden />
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'tap flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-bold transition active:scale-95',
        'border-neutral-300 bg-surface-raised text-brand-800 hover:bg-brand-50',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
