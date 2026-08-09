'use client';

import type { RevenuePoint } from '@rescuebite/types';
import { EmptyState } from '@rescuebite/ui/web';
import { formatDayLabel, formatMoney } from '@/lib/format';

/**
 * Lightweight, dependency-free bar chart for daily revenue. Bars flex to fill
 * the container so it stays responsive on a phone. Each bar is labelled and
 * carries an accessible title with the exact amount.
 */
export function RevenueChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const max = Math.max(...data.map((d) => d.revenueMinor), 0);

  if (data.length === 0) {
    return <EmptyState title="No revenue data yet" className="py-8" />;
  }

  // An all-zero series drew a full-height row of 2%-tall stubs and a large blank
  // plot area that said nothing. Say it in words instead of reserving the space.
  if (max === 0) {
    return (
      <EmptyState
        title="No sales in the last 7 days"
        description="Publish a listing and revenue will chart here as orders come in."
        className="py-8"
      />
    );
  }

  return (
    <figure className="m-0">
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Revenue per day">
        {data.map((d) => {
          const heightPct = Math.max((d.revenueMinor / max) * 100, 2);
          return (
            <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-brand-400 transition-all duration-fast group-hover:bg-brand-600"
                  style={{ height: `${heightPct}%` }}
                  title={`${formatDayLabel(d.date)}: ${formatMoney(d.revenueMinor, currency)}`}
                />
              </div>
              <span className="nums text-[11px] text-subtle-foreground">
                {formatDayLabel(d.date).split(' ')[1]}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="nums mt-3 border-t border-line pt-3 text-xs text-muted-foreground">
        Peak day {formatMoney(max, currency)} · total{' '}
        {formatMoney(
          data.reduce((sum, d) => sum + d.revenueMinor, 0),
          currency,
        )}
      </figcaption>
    </figure>
  );
}
