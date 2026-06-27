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
