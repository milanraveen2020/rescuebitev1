import { z } from 'zod';

export const UserRoleSchema = z.enum(['customer', 'merchant', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/** Lifecycle of a single surprise bag listing for a given day. */
export const ListingStatusSchema = z.enum(['draft', 'active', 'sold_out', 'expired', 'cancelled']);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

/** Lifecycle of a customer reservation. */
export const ReservationStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'collected',
  'no_show',
  'cancelled',
  'refunded',
]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const PaymentStatusSchema = z.enum([
  'requires_payment',
  'processing',
  'succeeded',
  'failed',
  'refunded',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/** Coarse food categories used for filtering and dietary surfacing. */
export const FoodCategorySchema = z.enum([
  'bakery',
  'grocery',
  'restaurant',
  'cafe',
  'produce',
  'other',
]);
export type FoodCategory = z.infer<typeof FoodCategorySchema>;

export const DietaryTagSchema = z.enum([
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten_free',
  'dairy_free',
  'nut_free',
]);
export type DietaryTag = z.infer<typeof DietaryTagSchema>;
