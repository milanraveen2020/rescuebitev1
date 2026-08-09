import { z } from 'zod';

/**
 * Shared primitive schemas. Prices are integer minor units (cents) everywhere to
 * avoid floating-point drift — never store or pass money as floats.
 */

export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** ISO 4217 currency code, upper-cased (e.g. "EUR"). */
export const CurrencySchema = z.string().length(3).toUpperCase();
export type Currency = z.infer<typeof CurrencySchema>;

/**
 * Currencies a store can actually be set to, with the symbol used for display.
 *
 * `CurrencySchema` stays permissive so historical rows always parse, but writes
 * go through `SupportedCurrencySchema`: a free-text 3-letter field let a typo
 * like "EUR " or "USDD" reach the column that renders every customer-facing
 * price. Stripe presentment currencies — extend as new markets open.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan rupee' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian rupee' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish krona' },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export const SupportedCurrencySchema = z.enum([
  SUPPORTED_CURRENCIES[0].code,
  ...SUPPORTED_CURRENCIES.slice(1).map((c) => c.code),
] as [SupportedCurrencyCode, ...SupportedCurrencyCode[]]);

/** A price in minor units (cents). Always a non-negative integer. */
export const MinorUnitsSchema = z.number().int().nonnegative();

/** Self-describing money value (minor units + currency). */
export const MoneySchema = z.object({
  amountMinor: MinorUnitsSchema,
  currency: CurrencySchema,
});
export type Money = z.infer<typeof MoneySchema>;

/** A 1–5 star rating. */
export const RatingSchema = z.number().int().min(1).max(5);
export type Rating = z.infer<typeof RatingSchema>;

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;
