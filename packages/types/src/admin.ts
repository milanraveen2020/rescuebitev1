import { z } from 'zod';
import {
  FoodCategorySchema,
  OrderStatusSchema,
  StoreStatusSchema,
  UserRoleSchema,
  UserStatusSchema,
} from './enums.js';
import { OrderSchema, ReviewSchema, StoreSchema, UserSchema } from './entities.js';
import { ListingSchema } from './listings.js';
import { RevenuePointSchema } from './merchant.js';
import { OffsetPaginationQuerySchema } from './pagination.js';
import { CurrencySchema, IdSchema, IsoDateTimeSchema, MinorUnitsSchema } from './primitives.js';

/**
 * Platform-admin contracts: overview KPIs, moderation queues, audit log, and
 * settings. Every list endpoint is offset-paginated; every mutation is recorded
 * in the audit log on the server.
 */

// --- Overview ---------------------------------------------------------------

export const AdminOverviewQuerySchema = z.object({
  /** Inclusive date range (YYYY-MM-DD). Defaults to the last 30 days. */
  from: z.string().optional(),
  to: z.string().optional(),
});
export type AdminOverviewQuery = z.infer<typeof AdminOverviewQuerySchema>;

export const AdminOverviewSchema = z.object({
  gmvMinor: MinorUnitsSchema,
  currency: CurrencySchema,
  orders: z.number().int().nonnegative(),
  activeStores: z.number().int().nonnegative(),
  newUsers: z.number().int().nonnegative(),
  mealsRescued: z.number().int().nonnegative(),
  revenueSeries: z.array(RevenuePointSchema),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

// --- Shared list responses --------------------------------------------------

function offsetPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}

// --- Users ------------------------------------------------------------------

export const AdminUserQuerySchema = OffsetPaginationQuerySchema.extend({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
});
export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>;

export const AdminUserSchema = UserSchema.extend({
  orderCount: z.number().int().nonnegative(),
  storeCount: z.number().int().nonnegative(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;
export const AdminUserPageSchema = offsetPage(AdminUserSchema);

export const SuspendUserSchema = z.object({ reason: z.string().max(500).optional() });
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;

export const UpdateUserRoleSchema = z.object({ role: UserRoleSchema });
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

// --- Stores -----------------------------------------------------------------

export const AdminStoreQuerySchema = OffsetPaginationQuerySchema.extend({
  search: z.string().optional(),
  status: StoreStatusSchema.optional(),
});
export type AdminStoreQuery = z.infer<typeof AdminStoreQuerySchema>;

export const AdminStoreSchema = StoreSchema.extend({
  ownerEmail: z.string().email(),
  ownerName: z.string(),
  listingCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
});
export type AdminStore = z.infer<typeof AdminStoreSchema>;
export const AdminStorePageSchema = offsetPage(AdminStoreSchema);

export const RejectStoreSchema = z.object({ reason: z.string().min(1).max(500) });
export type RejectStoreInput = z.infer<typeof RejectStoreSchema>;

// --- Listings ---------------------------------------------------------------

export const AdminListingQuerySchema = OffsetPaginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD_OUT', 'EXPIRED']).optional(),
  storeId: IdSchema.optional(),
});
export type AdminListingQuery = z.infer<typeof AdminListingQuerySchema>;

export const AdminListingSchema = ListingSchema.extend({ storeName: z.string() });
export type AdminListing = z.infer<typeof AdminListingSchema>;
export const AdminListingPageSchema = offsetPage(AdminListingSchema);

// --- Orders -----------------------------------------------------------------

export const AdminOrderQuerySchema = OffsetPaginationQuerySchema.extend({
  search: z.string().optional(),
  status: OrderStatusSchema.optional(),
});
export type AdminOrderQuery = z.infer<typeof AdminOrderQuerySchema>;

export const AdminOrderSchema = OrderSchema.extend({
  customerEmail: z.string().email(),
  customerName: z.string(),
  storeName: z.string(),
  listingTitle: z.string(),
});
export type AdminOrder = z.infer<typeof AdminOrderSchema>;
export const AdminOrderPageSchema = offsetPage(AdminOrderSchema);

// --- Reviews ----------------------------------------------------------------

export const AdminReviewQuerySchema = OffsetPaginationQuerySchema.extend({
  search: z.string().optional(),
  // Sent as a query string; coerce 'true'/'false' correctly (z.coerce.boolean
  // would turn the string 'false' into `true`).
  hidden: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type AdminReviewQuery = z.infer<typeof AdminReviewQuerySchema>;

export const AdminReviewSchema = ReviewSchema.extend({
  storeName: z.string(),
  customerName: z.string(),
});
export type AdminReview = z.infer<typeof AdminReviewSchema>;
export const AdminReviewPageSchema = offsetPage(AdminReviewSchema);

export const HideReviewSchema = z.object({ reason: z.string().max(500).optional() });
export type HideReviewInput = z.infer<typeof HideReviewSchema>;

// --- Audit log --------------------------------------------------------------

export const AuditLogQuerySchema = OffsetPaginationQuerySchema.extend({
  entity: z.string().optional(),
  action: z.string().optional(),
  actorId: IdSchema.optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const AuditLogEntrySchema = z.object({
  id: IdSchema,
  actorId: IdSchema.nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export const AuditLogPageSchema = offsetPage(AuditLogEntrySchema);

// --- Bulk actions -----------------------------------------------------------

export const BulkIdsSchema = z.object({ ids: z.array(IdSchema).min(1).max(100) });
export type BulkIdsInput = z.infer<typeof BulkIdsSchema>;

export const BulkResultSchema = z.object({ affected: z.number().int().nonnegative() });
export type BulkResult = z.infer<typeof BulkResultSchema>;

// --- Settings ---------------------------------------------------------------

export const PlatformSettingsSchema = z.object({
  commissionBps: z.number().int().min(0).max(10_000),
  enabledCategories: z.array(FoodCategorySchema),
  featureFlags: z.record(z.string(), z.boolean()),
  updatedAt: IsoDateTimeSchema,
});
export type PlatformSettings = z.infer<typeof PlatformSettingsSchema>;

export const UpdateSettingsSchema = z
  .object({
    commissionBps: z.number().int().min(0).max(10_000),
    enabledCategories: z.array(FoodCategorySchema),
    featureFlags: z.record(z.string(), z.boolean()),
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
