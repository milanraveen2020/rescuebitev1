import { z } from 'zod';
import { FoodCategorySchema } from './enums.js';
import { CurrencySchema, IdSchema, IsoDateTimeSchema, MinorUnitsSchema } from './primitives.js';

/** Merchant dashboard, analytics, store-profile, and staff contracts. */

// --- Store profile edit ----------------------------------------------------

export const UpdateStoreSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).nullable(),
    category: FoodCategorySchema,
    address: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    logoUrl: z.string().url().nullable(),
    coverUrl: z.string().url().nullable(),
    openingHours: z.string().max(200).nullable(),
  })
  .partial();
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

// --- Dashboard snapshot -----------------------------------------------------

export const RevenuePointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  revenueMinor: MinorUnitsSchema,
});
export type RevenuePoint = z.infer<typeof RevenuePointSchema>;

export const MerchantDashboardSchema = z.object({
  activeListings: z.number().int().nonnegative(),
  ordersToFulfill: z.number().int().nonnegative(),
  revenueTodayMinor: MinorUnitsSchema,
  currency: CurrencySchema,
  /** 0–100 sell-through of today's listings (sold / total quantity). */
  sellThroughPercent: z.number().int().min(0).max(100),
  revenueSeries: z.array(RevenuePointSchema),
});
export type MerchantDashboard = z.infer<typeof MerchantDashboardSchema>;

// --- Analytics --------------------------------------------------------------

export const TopListingSchema = z.object({
  id: IdSchema,
  title: z.string(),
  ordersCount: z.number().int().nonnegative(),
  quantitySold: z.number().int().nonnegative(),
});
export type TopListing = z.infer<typeof TopListingSchema>;

export const MerchantAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(14),
});
export type MerchantAnalyticsQuery = z.infer<typeof MerchantAnalyticsQuerySchema>;

export const MerchantAnalyticsSchema = z.object({
  revenueSeries: z.array(RevenuePointSchema),
  topListings: z.array(TopListingSchema),
  sellThroughPercent: z.number().int().min(0).max(100),
  /** Bags rescued (collected orders) and the estimated CO₂ saved. */
  bagsRescued: z.number().int().nonnegative(),
  co2KgSaved: z.number().nonnegative(),
});
export type MerchantAnalytics = z.infer<typeof MerchantAnalyticsSchema>;

// --- Staff ------------------------------------------------------------------

export const StaffMemberSchema = z.object({
  id: IdSchema,
  name: z.string(),
  email: z.string().email(),
  createdAt: IsoDateTimeSchema,
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

export const InviteStaffSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(120),
});
export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

/** A newly invited staff member plus the one-time temporary password to share. */
export const StaffInviteResultSchema = z.object({
  staff: StaffMemberSchema,
  tempPassword: z.string(),
});
export type StaffInviteResult = z.infer<typeof StaffInviteResultSchema>;

// --- Payout transfers -------------------------------------------------------

export const TransferSchema = z.object({
  id: z.string(),
  amountMinor: MinorUnitsSchema,
  currency: CurrencySchema,
  createdAt: IsoDateTimeSchema,
});
export type Transfer = z.infer<typeof TransferSchema>;
