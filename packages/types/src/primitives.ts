import { z } from 'zod';

/**
 * Shared primitive schemas. Keep money in integer minor units (cents) everywhere
 * to avoid floating-point drift — never store prices as floats.
 */

export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** Money in minor units (e.g. cents). Always a non-negative integer. */
export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).toUpperCase(),
});
export type Money = z.infer<typeof MoneySchema>;

export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

/** A pickup window with an inclusive start and exclusive end. */
export const TimeWindowSchema = z
  .object({
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
  })
  .refine((w) => new Date(w.startsAt) < new Date(w.endsAt), {
    message: 'startsAt must be before endsAt',
    path: ['endsAt'],
  });
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;
