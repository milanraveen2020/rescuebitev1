import { z } from 'zod';
import {
  FoodCategorySchema,
  OrderStatusSchema,
  StoreStatusSchema,
  UserRoleSchema,
  UserStatusSchema,
} from './enums.js';
import { EmailSchema, PasswordSchema } from './auth.js';
import { OrderSchema, ReviewSchema, StoreSchema, UserSchema } from './entities.js';
import { ListingSchema } from './listings.js';
import { RevenuePointSchema } from './merchant.js';
import { OffsetPaginationQuerySchema } from './pagination.js';
import {
  CurrencySchema,
  IdSchema,
  IsoDateTimeSchema,
  MinorUnitsSchema,
  SupportedCurrencySchema,
} from './primitives.js';

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

/**
 * The subset of platform settings any client may read without authentication.
 *
 * Exists so the customer app and the merchant listing form can offer exactly the
 * categories the operator has switched on, instead of each hardcoding the full
 * `FoodCategory` enum and silently ignoring the admin's configuration.
 */
export const PublicConfigSchema = z.object({
  enabledCategories: z.array(FoodCategorySchema),
});
export type PublicConfig = z.infer<typeof PublicConfigSchema>;

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

// --- Merchant provisioning --------------------------------------------------

/**
 * Admin-created merchant account. The admin supplies only the essentials plus a
 * temporary password; the merchant completes store setup after their first
 * login (which forces a password change).
 */
export const CreateMerchantSchema = z.object({
  name: z.string().min(1).max(120),
  email: EmailSchema,
  phone: z.string().min(5).max(20),
  temporaryPassword: PasswordSchema,
  /** Store name shown to customers. */
  storeName: z.string().min(1).max(120),
  /** Street address. Coordinates are set by the merchant during store setup. */
  storeAddress: z.string().min(1).max(300),
});
export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;

/** The provisioned merchant, returned once so the admin can hand over details. */
export const CreatedMerchantSchema = z.object({
  user: UserSchema,
  storeId: IdSchema,
  storeName: z.string(),
});
export type CreatedMerchant = z.infer<typeof CreatedMerchantSchema>;

/**
 * Admin edit of a merchant: store details plus the owner's contact fields.
 * Every field is optional — send only what changed.
 */
export const UpdateMerchantSchema = z
  .object({
    // Store
    storeName: z.string().min(1).max(120),
    storeAddress: z.string().min(1).max(300),
    category: FoodCategorySchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    /** Frozen once the store has orders — see `Store.currencyLocked`. */
    currency: SupportedCurrencySchema,
    /** Free-text opening hours shown to customers on every bag. */
    openingHours: z.string().max(200).nullable(),
    /** Store blurb shown on the customer-facing bag detail. */
    description: z.string().max(2000).nullable(),
    // Owner
    ownerName: z.string().min(1).max(120),
    ownerEmail: EmailSchema,
    ownerPhone: z.string().min(5).max(20),
  })
  .partial();
export type UpdateMerchantInput = z.infer<typeof UpdateMerchantSchema>;
