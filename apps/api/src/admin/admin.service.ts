import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ListingStatus,
  OrderStatus,
  StoreStatus,
  UserStatus,
  type Listing,
  type Order,
  type Prisma,
  type Review,
  type Store,
  type User,
} from '@prisma/client';
import type {
  AdminListing,
  AdminListingQuery,
  AdminOrder,
  AdminOrderQuery,
  AdminOverview,
  AdminOverviewQuery,
  AdminReview,
  AdminReviewQuery,
  AdminStore,
  AdminStoreQuery,
  AdminUser,
  AdminUserQuery,
  BulkResult,
  HideReviewInput,
  OrderDetail,
  PlatformSettings,
  RejectStoreInput,
  SuspendUserInput,
  UpdateSettingsInput,
  UpdateUserRoleInput,
} from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../common/settings/settings.service';
import { toOffsetFindArgs, toOffsetPage, type OffsetPage } from '../common/pagination/pagination';
import { PaymentsService } from '../payments/payments.service';
import { AuditLogService } from './audit-log.service';

const PAID_OR_COLLECTED: OrderStatus[] = [OrderStatus.PAID, OrderStatus.COLLECTED];
const insensitive = (search: string): Prisma.StringFilter => ({
  contains: search,
  mode: 'insensitive',
});

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditLogService,
  ) {}

  // --- Overview ------------------------------------------------------------

  async overview(query: AdminOverviewQuery): Promise<AdminOverview> {
    const { start, end } = resolveRange(query);
    const inRange = { gte: start, lt: end };

    const [gmv, orders, activeStores, newUsers, meals, currencyStore] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: PAID_OR_COLLECTED }, createdAt: inRange },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { createdAt: inRange } }),
      this.prisma.store.count({ where: { status: StoreStatus.APPROVED } }),
      this.prisma.user.count({ where: { createdAt: inRange } }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.COLLECTED, createdAt: inRange },
        _sum: { quantity: true },
      }),
      this.prisma.store.findFirst({ select: { currency: true } }),
    ]);

    return {
      gmvMinor: gmv._sum.totalAmount ?? 0,
      currency: currencyStore?.currency ?? 'EUR',
      orders,
      activeStores,
      newUsers,
      mealsRescued: meals._sum.quantity ?? 0,
      revenueSeries: await this.revenueSeries(start, end),
    };
  }

  private async revenueSeries(start: Date, end: Date): Promise<AdminOverview['revenueSeries']> {
    const rows = await this.prisma.order.findMany({
      where: { status: { in: PAID_OR_COLLECTED }, createdAt: { gte: start, lt: end } },
      select: { totalAmount: true, createdAt: true },
    });
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      totals.set(key, (totals.get(key) ?? 0) + row.totalAmount);
    }
    const series: AdminOverview['revenueSeries'] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ date: key, revenueMinor: totals.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  }

  // --- Users ---------------------------------------------------------------

  async listUsers(query: AdminUserQuery): Promise<OffsetPage<AdminUser>> {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [{ email: insensitive(query.search) }, { name: insensitive(query.search) }];
    }
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    const args = toOffsetFindArgs(
      query,
      ['createdAt', 'email', 'name', 'role', 'status'],
      'createdAt',
    );
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...args,
        include: { _count: { select: { orders: true, ownedStores: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return toOffsetPage(rows.map(toAdminUser), total, query);
  }

  async getUser(id: string): Promise<AdminUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, ownedStores: true } } },
    });
    if (!user) throw new NotFoundException('User not found.');
    return toAdminUser(user);
  }

  async suspendUser(adminId: string, id: string, input: SuspendUserInput): Promise<AdminUser> {
    const user = await this.setUserStatus(id, UserStatus.SUSPENDED);
    await this.audit.record({
      actorId: adminId,
      action: 'user.suspend',
      entity: 'User',
      entityId: id,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
    return user;
  }

  async reactivateUser(adminId: string, id: string): Promise<AdminUser> {
    const user = await this.setUserStatus(id, UserStatus.ACTIVE);
    await this.audit.record({
      actorId: adminId,
      action: 'user.reactivate',
      entity: 'User',
      entityId: id,
    });
    return user;
  }

  async updateUserRole(
    adminId: string,
    id: string,
    input: UpdateUserRoleInput,
  ): Promise<AdminUser> {
    await this.requireUser(id);
    await this.prisma.user.update({ where: { id }, data: { role: input.role } });
    await this.audit.record({
      actorId: adminId,
      action: 'user.role_change',
      entity: 'User',
      entityId: id,
      metadata: { role: input.role },
    });
    return this.getUser(id);
  }

  private async setUserStatus(id: string, status: UserStatus): Promise<AdminUser> {
    await this.requireUser(id);
    await this.prisma.user.update({ where: { id }, data: { status } });
    return this.getUser(id);
  }

  private async requireUser(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('User not found.');
  }

  // --- Stores --------------------------------------------------------------

  async listStores(query: AdminStoreQuery): Promise<OffsetPage<AdminStore>> {
    const where: Prisma.StoreWhereInput = {};
    if (query.search) {
      where.OR = [{ name: insensitive(query.search) }, { address: insensitive(query.search) }];
    }
    if (query.status) where.status = query.status;

    const args = toOffsetFindArgs(query, ['createdAt', 'name', 'status', 'rating'], 'createdAt');
    const [rows, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        ...args,
        include: { owner: true, _count: { select: { listings: true, orders: true } } },
      }),
      this.prisma.store.count({ where }),
    ]);
    return toOffsetPage(rows.map(toAdminStore), total, query);
  }

  async getStore(id: string): Promise<AdminStore> {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { owner: true, _count: { select: { listings: true, orders: true } } },
    });
    if (!store) throw new NotFoundException('Store not found.');
    return toAdminStore(store);
  }

  async approveStore(adminId: string, id: string): Promise<AdminStore> {
    await this.requireStore(id);
    await this.prisma.store.update({ where: { id }, data: { status: StoreStatus.APPROVED } });
    await this.audit.record({
      actorId: adminId,
      action: 'store.approve',
      entity: 'Store',
      entityId: id,
    });
    return this.getStore(id);
  }

  async rejectStore(adminId: string, id: string, input: RejectStoreInput): Promise<AdminStore> {
    await this.requireStore(id);
    await this.prisma.store.update({ where: { id }, data: { status: StoreStatus.REJECTED } });
    await this.audit.record({
      actorId: adminId,
      action: 'store.reject',
      entity: 'Store',
      entityId: id,
      metadata: { reason: input.reason },
    });
    return this.getStore(id);
  }

  async bulkApproveStores(adminId: string, ids: string[]): Promise<BulkResult> {
    const result = await this.prisma.store.updateMany({
      where: { id: { in: ids }, status: StoreStatus.PENDING },
      data: { status: StoreStatus.APPROVED },
    });
    await this.audit.record({
      actorId: adminId,
      action: 'store.bulk_approve',
      entity: 'Store',
      entityId: ids.join(','),
      metadata: { ids, affected: result.count },
    });
    return { affected: result.count };
  }

  private async requireStore(id: string): Promise<void> {
    const exists = await this.prisma.store.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Store not found.');
  }

  // --- Listings ------------------------------------------------------------

  async listListings(query: AdminListingQuery): Promise<OffsetPage<AdminListing>> {
    const where: Prisma.ListingWhereInput = {};
    if (query.search) where.title = insensitive(query.search);
    if (query.status) where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;

    const args = toOffsetFindArgs(query, ['createdAt', 'title', 'price', 'status'], 'createdAt');
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        ...args,
        include: { store: { select: { name: true, currency: true } } },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return toOffsetPage(rows.map(toAdminListing), total, query);
  }

  async unpublishListing(adminId: string, id: string): Promise<AdminListing> {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found.');
    await this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.EXPIRED } });
    await this.audit.record({
      actorId: adminId,
      action: 'listing.unpublish',
      entity: 'Listing',
      entityId: id,
    });
    return this.getListing(id);
  }

  async bulkUnpublishListings(adminId: string, ids: string[]): Promise<BulkResult> {
    const result = await this.prisma.listing.updateMany({
      where: { id: { in: ids }, status: { not: ListingStatus.EXPIRED } },
      data: { status: ListingStatus.EXPIRED },
    });
    await this.audit.record({
      actorId: adminId,
      action: 'listing.bulk_unpublish',
      entity: 'Listing',
      entityId: ids.join(','),
      metadata: { ids, affected: result.count },
    });
    return { affected: result.count };
  }

  private async getListing(id: string): Promise<AdminListing> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { store: { select: { name: true, currency: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    return toAdminListing(listing);
  }

  // --- Orders --------------------------------------------------------------

  async listOrders(query: AdminOrderQuery): Promise<OffsetPage<AdminOrder>> {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { pickupCode: insensitive(query.search) },
        { customer: { email: insensitive(query.search) } },
        { store: { name: insensitive(query.search) } },
      ];
    }

    const args = toOffsetFindArgs(query, ['createdAt', 'totalAmount', 'status'], 'createdAt');
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        ...args,
        include: {
          customer: { select: { email: true, name: true } },
          store: { select: { name: true } },
          listing: { select: { title: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return toOffsetPage(rows.map(toAdminOrder), total, query);
  }

  async getOrder(id: string): Promise<AdminOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { email: true, name: true } },
        store: { select: { name: true } },
        listing: { select: { title: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return toAdminOrder(order);
  }

  async refundOrder(adminId: string, id: string): Promise<OrderDetail> {
    const detail = await this.payments.refundAsAdmin(id);
    await this.audit.record({
      actorId: adminId,
      action: 'order.refund',
      entity: 'Order',
      entityId: id,
    });
    return detail;
  }

  // --- Reviews -------------------------------------------------------------

  async listReviews(query: AdminReviewQuery): Promise<OffsetPage<AdminReview>> {
    const where: Prisma.ReviewWhereInput = {};
    if (query.search) where.comment = insensitive(query.search);
    if (query.hidden !== undefined) where.hiddenAt = query.hidden ? { not: null } : null;

    const args = toOffsetFindArgs(query, ['createdAt', 'rating'], 'createdAt');
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        ...args,
        include: { store: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);
    return toOffsetPage(rows.map(toAdminReview), total, query);
  }

  async hideReview(adminId: string, id: string, input: HideReviewInput): Promise<AdminReview> {
    const review = await this.requireReview(id);
    await this.prisma.review.update({ where: { id }, data: { hiddenAt: new Date() } });
    await this.recomputeStoreRating(review.storeId);
    await this.audit.record({
      actorId: adminId,
      action: 'review.hide',
      entity: 'Review',
      entityId: id,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
    return this.getReview(id);
  }

  async unhideReview(adminId: string, id: string): Promise<AdminReview> {
    const review = await this.requireReview(id);
    await this.prisma.review.update({ where: { id }, data: { hiddenAt: null } });
    await this.recomputeStoreRating(review.storeId);
    await this.audit.record({
      actorId: adminId,
      action: 'review.unhide',
      entity: 'Review',
      entityId: id,
    });
    return this.getReview(id);
  }

  async removeReview(adminId: string, id: string): Promise<void> {
    const review = await this.requireReview(id);
    await this.prisma.review.delete({ where: { id } });
    await this.recomputeStoreRating(review.storeId);
    await this.audit.record({
      actorId: adminId,
      action: 'review.remove',
      entity: 'Review',
      entityId: id,
    });
  }

  private async requireReview(id: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found.');
    return review;
  }

  private async getReview(id: string): Promise<AdminReview> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { store: { select: { name: true } }, customer: { select: { name: true } } },
    });
    if (!review) throw new NotFoundException('Review not found.');
    return toAdminReview(review);
  }

  /** Recompute a store's denormalized rating from its non-hidden reviews. */
  private async recomputeStoreRating(storeId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { storeId, hiddenAt: null },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.store.update({
      where: { id: storeId },
      data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
  }

  // --- Settings ------------------------------------------------------------

  getSettings(): Promise<PlatformSettings> {
    return this.settings.getSettings();
  }

  async updateSettings(adminId: string, input: UpdateSettingsInput): Promise<PlatformSettings> {
    const updated = await this.settings.updateSettings(input);
    await this.audit.record({
      actorId: adminId,
      action: 'settings.update',
      entity: 'PlatformSettings',
      entityId: 'singleton',
      metadata: input,
    });
    return updated;
  }
}

// --- Date range -------------------------------------------------------------

function resolveRange(query: AdminOverviewQuery): { start: Date; end: Date } {
  const end = query.to ? new Date(`${query.to}T00:00:00`) : new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1); // inclusive of the `to` day
  const start = query.from ? new Date(`${query.from}T00:00:00`) : new Date(end);
  if (!query.from) start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

// --- Mappers ----------------------------------------------------------------

type UserWithCounts = User & { _count: { orders: number; ownedStores: number } };
function toAdminUser(user: UserWithCounts): AdminUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    orderCount: user._count.orders,
    storeCount: user._count.ownedStores,
  };
}

type StoreWithRels = Store & {
  owner: { email: string; name: string };
  _count: { listings: number; orders: number };
};
function toAdminStore(store: StoreWithRels): AdminStore {
  return {
    id: store.id,
    ownerId: store.ownerId,
    name: store.name,
    description: store.description,
    category: store.category,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    logoUrl: store.logoUrl,
    coverUrl: store.coverUrl,
    openingHours: store.openingHours,
    currency: store.currency,
    stripeAccountId: store.stripeAccountId,
    payoutsEnabled: store.payoutsEnabled,
    rating: store.rating,
    reviewCount: store.reviewCount,
    status: store.status,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    ownerEmail: store.owner.email,
    ownerName: store.owner.name,
    listingCount: store._count.listings,
    orderCount: store._count.orders,
  };
}

type ListingWithStore = Listing & { store: { name: string; currency: string } };
function toAdminListing(listing: ListingWithStore): AdminListing {
  const discountPercent =
    listing.originalPrice > 0
      ? Math.max(0, Math.round((1 - listing.price / listing.originalPrice) * 100))
      : 0;
  return {
    id: listing.id,
    storeId: listing.storeId,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    originalPrice: listing.originalPrice,
    price: listing.price,
    currency: listing.store.currency,
    quantityTotal: listing.quantityTotal,
    quantityRemaining: listing.quantityRemaining,
    pickupStart: listing.pickupStart.toISOString(),
    pickupEnd: listing.pickupEnd.toISOString(),
    imageUrl: listing.imageUrl,
    allergenInfo: listing.allergenInfo,
    status: listing.status,
    discountPercent,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    storeName: listing.store.name,
  };
}

type OrderWithRels = Order & {
  customer: { email: string; name: string };
  store: { name: string };
  listing: { title: string };
};
function toAdminOrder(order: OrderWithRels): AdminOrder {
  return {
    id: order.id,
    customerId: order.customerId,
    listingId: order.listingId,
    storeId: order.storeId,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalAmount: order.totalAmount,
    currency: order.currency,
    status: order.status,
    pickupCode: order.pickupCode,
    stripePaymentIntentId: order.stripePaymentIntentId,
    reservationExpiresAt: order.reservationExpiresAt
      ? order.reservationExpiresAt.toISOString()
      : null,
    createdAt: order.createdAt.toISOString(),
    collectedAt: order.collectedAt ? order.collectedAt.toISOString() : null,
    updatedAt: order.updatedAt.toISOString(),
    customerEmail: order.customer.email,
    customerName: order.customer.name,
    storeName: order.store.name,
    listingTitle: order.listing.title,
  };
}

type ReviewWithRels = Review & { store: { name: string }; customer: { name: string } };
function toAdminReview(review: ReviewWithRels): AdminReview {
  return {
    id: review.id,
    orderId: review.orderId,
    customerId: review.customerId,
    storeId: review.storeId,
    rating: review.rating,
    comment: review.comment,
    hiddenAt: review.hiddenAt ? review.hiddenAt.toISOString() : null,
    createdAt: review.createdAt.toISOString(),
    storeName: review.store.name,
    customerName: review.customer.name,
  };
}
