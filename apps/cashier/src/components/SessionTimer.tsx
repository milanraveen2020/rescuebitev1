'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatCountdown, formatTime } from '@/lib/format';

interface SessionTimerProps {
  startTime: string;
  scheduledEndTime: string;
  /** Authoritative clock — timers must not trust the device clock alone. */
  now: () => number;
  onExpire?: () => void;
  frozen?: boolean;
}

/** Countdown as a start→end timeline: a big time with a horizontal progress
 * bar. Amber (<10m) and red (<2m) warning states. */
export function SessionTimer({
  startTime,
  scheduledEndTime,
  now,
  onExpire,
  frozen,
}: SessionTimerProps) {
  const [tick, setTick] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [frozen]);

  const start = new Date(startTime).getTime();
  const end = new Date(scheduledEndTime).getTime();
  const current = frozen ? end : now();
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - current);
  const elapsedFrac = Math.min(1, Math.max(0, (current - start) / total));

  useEffect(() => {
    if (frozen) return;
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire, frozen, tick]);

  const warning = remaining <= 2 * 60000;
  const caution = !warning && remaining <= 10 * 60000;
  const fill = warning ? 'bg-danger-500' : caution ? 'bg-warning-500' : 'bg-brand-gradient';
  const numColor = warning ? 'text-danger-600' : caution ? 'text-warning-700' : 'text-neutral-900';

  return (
    <div className="w-full">
      <div className="flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
          {frozen ? 'Session ended' : 'Time left'}
        </span>
        <span
          className={cn(
            'mt-1.5 font-display text-[44px] font-extrabold leading-none tracking-tight tabular-nums',
            numColor,
            warning && !frozen && 'animate-pulse',
          )}
        >
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="mt-6 h-2.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
        <div
          className={cn('h-full rounded-pill transition-[width] duration-700 ease-standard', fill)}
          style={{ width: `${Math.max(2, elapsedFrac * 100)}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-neutral-500">
        <span>{formatTime(startTime)}</span>
        <span>{formatTime(scheduledEndTime)}</span>
      </div>

      {(warning || caution) && !frozen ? (
        <p
          role="status"
          className={cn(
            'mx-auto mt-4 w-fit rounded-pill px-3 py-1 text-xs font-semibold',
            warning ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700',
          )}
        >
          {warning ? 'Ending very soon' : 'Under 10 minutes left'}
        </p>
      ) : null}
    </div>
  );
}
