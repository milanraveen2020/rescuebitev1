'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';

const PRESETS: { label: string; minutes: number }[] = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '2h 30m', minutes: 150 },
];

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const isPreset = PRESETS.some((p) => p.minutes === value);
  const [custom, setCustom] = useState(!isPreset);

  const hours = Math.floor(value / 60);
  const mins = value % 60;
  const setHours = (h: number) => onChange(Math.max(0, Math.min(12, h)) * 60 + mins);
  const setMins = (m: number) => {
    const clamped = ((m % 60) + 60) % 60;
    onChange(hours * 60 + Math.round(clamped / 5) * 5);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Session duration presets">
        {PRESETS.map((p) => {
          const active = !custom && value === p.minutes;
          return (
            <button
              key={p.minutes}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCustom(false);
                onChange(p.minutes);
              }}
              className={cn(
                'tap h-12 rounded-lg border text-sm font-semibold transition',
                active
                  ? 'border-brand-600 bg-brand-700 text-white'
                  : 'border-neutral-300 bg-surface-card text-neutral-700 hover:bg-surface-raised',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={custom}
        onClick={() => setCustom((c) => !c)}
        className={cn(
          'tap h-11 w-full rounded-lg border text-sm font-semibold transition',
          custom
            ? 'border-brand-600 bg-brand-50 text-brand-800'
            : 'border-neutral-300 bg-surface-card text-neutral-700 hover:bg-surface-raised',
        )}
      >
        Custom duration
      </button>

      {custom ? (
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-raised p-3 animate-fade-in">
          <CustomStepper
            label="Hours"
            value={hours}
            onDec={() => setHours(hours - 1)}
            onInc={() => setHours(hours + 1)}
          />
          <CustomStepper
            label="Minutes"
            value={mins}
            onDec={() => setMins(mins - 5)}
            onInc={() => setMins(mins + 5)}
            suffix="in 5s"
          />
        </div>
      ) : null}

      <p className="text-sm text-neutral-500">
        Total: <span className="font-semibold text-neutral-800">{formatDuration(value)}</span>
      </p>
    </div>
  );
}

function CustomStepper({
  label,
  value,
  onDec,
  onInc,
  suffix,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  suffix?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-neutral-600">
        {label}
        {suffix ? <span className="ml-1 font-normal text-neutral-400">({suffix})</span> : null}
      </p>
      <div className="flex items-center gap-2" role="group" aria-label={label}>
        <MiniButton label={`Decrease ${label}`} onClick={onDec}>
          <Minus className="h-4 w-4" aria-hidden />
        </MiniButton>
        <span className="min-w-8 flex-1 text-center font-display text-lg font-extrabold text-neutral-900">
          {value}
        </span>
        <MiniButton label={`Increase ${label}`} onClick={onInc}>
          <Plus className="h-4 w-4" aria-hidden />
        </MiniButton>
      </div>
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-surface-card text-brand-800 transition hover:bg-brand-50 active:scale-95"
    >
      {children}
    </button>
  );
}
