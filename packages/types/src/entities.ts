import { z } from 'zod';
import {
  DietaryTagSchema,
  FoodCategorySchema,
  ListingStatusSchema,
  PaymentStatusSchema,
  ReservationStatusSchema,
  UserRoleSchema,
} from './enums.js';
import {
  GeoPointSchema,
  IdSchema,
  IsoDateTimeSchema,
  MoneySchema,
  TimeWindowSchema,
} from './primitives.js';

/**
 * Core domain entities for RescueBite, expressed as Zod schemas so the same
 * definition validates API boundaries and drives static types across every app.
 * This file is the single source of truth — do not redeclare these shapes elsewhere.
 */

export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  role: UserRoleSchema,
  createdAt: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2).toUpperCase(),
  location: GeoPointSchema,
});
export type Address = z.infer<typeof AddressSchema>;

export const MerchantSchema = z.object({
  id: IdSchema,
  ownerUserId: IdSchema,
  name: z.string().min(1).max(120),
  category: FoodCategorySchema,
  description: z.string().max(1000).optional(),
  address: AddressSchema,
  logoUrl: z.string().url().optional(),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type Merchant = z.infer<typeof MerchantSchema>;

/** A "surprise bag" listing: a quantity of discounted surplus food for a pickup window. */
export const SurpriseBagSchema = z.object({
  id: IdSchema,
  merchantId: IdSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  category: FoodCategorySchema,
  dietaryTags: z.array(DietaryTagSchema).default([]),
  originalValue: MoneySchema,
  price: MoneySchema,
  quantityTotal: z.number().int().nonnegative(),
  quantityAvailable: z.number().int().nonnegative(),
  pickupWindow: TimeWindowSchema,
  status: ListingStatusSchema,
  imageUrl: z.string().url().optional(),
  createdAt: IsoDateTimeSchema,
});
export type SurpriseBag = z.infer<typeof SurpriseBagSchema>;

export const ReservationSchema = z.object({
  id: IdSchema,
  surpriseBagId: IdSchema,
  customerUserId: IdSchema,
  quantity: z.number().int().min(1),
  pricePaid: MoneySchema,
  status: ReservationStatusSchema,
  paymentStatus: PaymentStatusSchema,
  pickupCode: z.string().min(4).max(12),
  reservedAt: IsoDateTimeSchema,
  collectedAt: IsoDateTimeSchema.optional(),
});
export type Reservation = z.infer<typeof ReservationSchema>;
