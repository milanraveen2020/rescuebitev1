import type { ReactNode } from 'react';
import { cn } from './cn';

export interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode | undefined;
  /** Short qualifier under the value, e.g. "vs. last week" or "3 awaiting". */
  hint?: string | undefined;
  /** Directional change, rendered as a tinted delta chip. */
  delta?: { value: string; direction: 'up' | 'down' | 'flat' } | undefined;
  /** Draws attention to a single "hero" metric without recoloring the rest. */
  emphasis?: boolean | undefined;
  /** Renders the whole tile as a link target (caller supplies the wrapper). */
  className?: string | undefined;
}

const DELTA_TONE = {
  up: 'bg-success-50 text-success-700',
  down: 'bg-danger-50 text-danger-600',
  flat: 'bg-neutral-100 text-neutral-600',
} as const;

const DELTA_GLYPH = { up: '↑', down: '↓', flat: '→' } as const;

/**
 * A single metric. The value is the largest thing in the tile and the label sits
 * directly above it, so a row of tiles scans as a list of numbers rather than a
 * row of icons — the previous layout led with a floating icon and pushed the
 * number into third place visually.
 */
export function StatCard({ label, value, icon, hint, delta, emphasis, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative h-full overflow-hidden rounded-lg border p-4 transition duration-fast ease-standard sm:p-5',
        emphasis
          ? 'border-brand-200 bg-brand-50/60'
          : 'border-line bg-surface-card hover:border-line-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              'flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-md',
              emphasis ? 'bg-brand-100 text-brand-700' : 'bg-surface-raised text-muted-foreground',
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="nums mt-2 font-display text-[26px] font-bold leading-none tracking-tight text-neutral-900 sm:text-3xl">
        {value}
      </p>
      {(delta ?? hint) ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta ? (
            <span
              className={cn(
                'nums inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold',
                DELTA_TONE[delta.direction],
              )}
            >
              <span aria-hidden>{DELTA_GLYPH[delta.direction]}</span>
              {delta.value}
            </span>
          ) : null}
          {hint ? <span className="text-xs text-subtle-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Responsive metric row. Auto-fitting means a 4-metric and a 5-metric dashboard
 * both fill the width instead of leaving an orphan tile on the last row.
 */
export function StatGrid({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4 [@media(min-width:900px)]:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
        className,
      )}
    >
      {children}
    </div>
  );
}
