/** Formatting helpers shared across the merchant dashboard. */

/** Format integer minor units (e.g. cents) as a localized currency string. */
export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
      amountMinor / 100,
    );
  } catch {
    // Unknown currency code — fall back to a plain decimal with the code suffix.
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

/** Short day label for a YYYY-MM-DD date, e.g. "Mon 12". */
export function formatDayLabel(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(date);
}

/** Time range like "5:00 PM – 7:00 PM" for a pickup window. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

/** Title-case a SCREAMING_SNAKE enum value, e.g. "SOLD_OUT" → "Sold out". */
export function humanize(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
