import { discountPercent, formatPrice } from '../format';
import { cn } from './cn';

export interface PriceTagProps {
  originalMinor: number;
  priceMinor: number;
  currency?: string;
  className?: string;
}

/** Shows the discounted price with the original struck through + a discount badge. */
export function PriceTag({ originalMinor, priceMinor, currency = 'EUR', className }: PriceTagProps) {
  const percent = discountPercent(originalMinor, priceMinor);
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="text-lg font-bold text-neutral-900">{formatPrice(priceMinor, currency)}</span>
      {percent > 0 ? (
        <>
          <span className="text-sm text-neutral-400 line-through">
            {formatPrice(originalMinor, currency)}
          </span>
          <span className="rounded-pill bg-accent-100 px-1.5 py-0.5 text-xs font-semibold text-accent-700">
            -{percent}%
          </span>
        </>
      ) : null}
    </div>
  );
}
