'use client';

import type { RevenuePoint } from '@rescuebite/types';
import { formatDayLabel, formatMoney } from '@/lib/format';

/**
 * Lightweight, dependency-free bar chart for daily revenue. Bars flex to fill
 * the container so it stays responsive on a phone. Each bar is labelled and
 * carries an accessible title with the exact amount.
 */
export function RevenueChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const max = Math.max(1, ...data.map((d) => d.revenueMinor));

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No revenue data yet.</p>;
  }

  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Revenue per day">
      {data.map((d) => {
        const heightPct = Math.max((d.revenueMinor / max) * 100, 2);
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-brand-400 transition-all"
                style={{ height: `${heightPct}%` }}
                title={`${formatDayLabel(d.date)}: ${formatMoney(d.revenueMinor, currency)}`}
              />
            </div>
            <span className="text-[10px] tabular-nums text-neutral-400">
              {formatDayLabel(d.date).split(' ')[1]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
