/**
 * Presentation helpers shared by web and native primitives. Money is integer
 * minor units (cents) — never floats.
 */

const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };

/** Format minor units into a currency string, e.g. (499, 'EUR') → "€4.99". */
export function formatPrice(amountMinor: number, currency = 'EUR'): string {
  const symbol = SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
  return `${symbol}${(amountMinor / 100).toFixed(2)}`;
}

/** Whole-number discount percent from original → discounted price (0–100). */
export function discountPercent(originalMinor: number, priceMinor: number): number {
  if (originalMinor <= 0 || priceMinor >= originalMinor) return 0;
  return Math.round((1 - priceMinor / originalMinor) * 100);
}
