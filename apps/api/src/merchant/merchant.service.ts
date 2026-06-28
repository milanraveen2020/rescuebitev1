import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ListingStatus, OrderStatus, UserRole, type Store } from '@prisma/client';
import type {
  InviteStaffInput,
  MerchantAnalytics,
  MerchantDashboard,
  RevenuePoint,
  StaffInviteResult,
  StaffMember,
  Store as StoreDto,
  UpdateStoreInput,
} from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';

const CO2_KG_PER_BAG = 2.5; // rough estimate of food waste avoided per rescued bag
const PAID_OR_COLLECTED: OrderStatus[] = [OrderStatus.PAID, OrderStatus.COLLECTED];

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  /** The store a user may operate — their owned store, or the one they staff. */
  async resolveStore(userId: string): Promise<Store> {
    const owned = await this.prisma.store.findFirst({ where: { ownerId: userId } });
    if (owned) return owned;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.staffStoreId) {
      const store = await this.prisma.store.findUnique({ where: { id: user.staffStoreId } });
      if (store) return store;
    }
    throw new NotFoundException('No store is linked to this account.');
  }

  /** Owner-only store (for profile edits, analytics, staff, payouts). */
  private async resolveOwnedStore(userId: string): Promise<Store> {
    const owned = await this.prisma.store.findFirst({ where: { ownerId: userId } });
    if (!owned) throw new ForbiddenException('Only the store owner can do this.');
    return owned;
  }

  async getStore(userId: string): Promise<StoreDto> {
    return toStore(await this.resolveStore(userId));
  }

  async updateStore(userId: string, input: UpdateStoreInput): Promise<StoreDto> {
    const store = await this.resolveOwnedStore(userId);
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        name: input.name ?? undefined,
        description: input.description === undefined ? undefined : input.description,
        category: input.category ?? undefined,
        address: input.address ?? undefined,
        lat: input.lat ?? undefined,
        lng: input.lng ?? undefined,
        logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
        coverUrl: input.coverUrl === undefined ? undefined : input.coverUrl,
        openingHours: input.openingHours === undefined ? undefined : input.openingHours,
      },
    });
    return toStore(updated);
  }

  // --- Dashboard -----------------------------------------------------------

  async dashboard(userId: string): Promise<MerchantDashboard> {
    const store = await this.resolveStore(userId);
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [activeListings, ordersToFulfill, todaysOrders, todaysListings] = await Promise.all([
      this.prisma.listing.count({
        where: {
          storeId: store.id,
          status: ListingStatus.ACTIVE,
          pickupEnd: { gt: now },
          quantityRemaining: { gt: 0 },
        },
      }),
      this.prisma.order.count({ where: { storeId: store.id, status: OrderStatus.PAID } }),
      this.prisma.order.findMany({
        where: {
          storeId: store.id,
          status: { in: PAID_OR_COLLECTED },
          createdAt: { gte: startOfToday },
        },
        select: { totalAmount: true },
      }),
      this.prisma.listing.findMany({
        where: { storeId: store.id, pickupStart: { gte: startOfToday, lt: endOfToday } },
        select: { quantityTotal: true, quantityRemaining: true },
      }),
    ]);

    const revenueTodayMinor = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalQty = todaysListings.reduce((s, l) => s + l.quantityTotal, 0);
    const soldQty = todaysListings.reduce((s, l) => s + (l.quantityTotal - l.quantityRemaining), 0);

    return {
      activeListings,
      ordersToFulfill,
      revenueTodayMinor,
      currency: store.currency,
      sellThroughPercent: totalQty > 0 ? Math.round((soldQty / totalQty) * 100) : 0,
      revenueSeries: await this.revenueSeries(store.id, 7),
    };
  }

  // --- Analytics -----------------------------------------------------------

  async analytics(userId: string, days: number): Promise<MerchantAnalytics> {
    const store = await this.resolveOwnedStore(userId);

    const [revenueSeries, orders, listings] = await Promise.all([
      this.revenueSeries(store.id, days),
      this.prisma.order.findMany({
        where: { storeId: store.id, status: { in: PAID_OR_COLLECTED } },
        select: {
          listingId: true,
          quantity: true,
          status: true,
          listing: { select: { title: true } },
        },
      }),
      this.prisma.listing.findMany({
        where: { storeId: store.id },
        select: { quantityTotal: true, quantityRemaining: true },
      }),
    ]);

    const byListing = new Map<
      string,
      { title: string; ordersCount: number; quantitySold: number }
    >();
    let bagsRescued = 0;
    for (const order of orders) {
      const entry = byListing.get(order.listingId) ?? {
        title: order.listing.title,
        ordersCount: 0,
        quantitySold: 0,
      };
      entry.ordersCount += 1;
      entry.quantitySold += order.quantity;
      byListing.set(order.listingId, entry);
      if (order.status === OrderStatus.COLLECTED) bagsRescued += order.quantity;
    }
    const topListings = [...byListing.entries()]
      .map(([id, v]) => ({
        id,
        title: v.title,
        ordersCount: v.ordersCount,
        quantitySold: v.quantitySold,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    const totalQty = listings.reduce((s, l) => s + l.quantityTotal, 0);
    const soldQty = listings.reduce((s, l) => s + (l.quantityTotal - l.quantityRemaining), 0);

    return {
      revenueSeries,
      topListings,
      sellThroughPercent: totalQty > 0 ? Math.round((soldQty / totalQty) * 100) : 0,
      bagsRescued,
      co2KgSaved: Math.round(bagsRescued * CO2_KG_PER_BAG * 10) / 10,
    };
  }

  /** Daily revenue (minor units) for the last `days` days, zero-filled. */
  private async revenueSeries(storeId: string, days: number): Promise<RevenuePoint[]> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const orders = await this.prisma.order.findMany({
      where: { storeId, status: { in: PAID_OR_COLLECTED }, createdAt: { gte: since } },
      select: { totalAmount: true, createdAt: true },
    });

    const totals = new Map<string, number>();
    for (const order of orders) {
      const key = isoDay(order.createdAt);
      totals.set(key, (totals.get(key) ?? 0) + order.totalAmount);
    }

    const series: RevenuePoint[] = [];
    for (let i = 0; i < days; i += 1) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = isoDay(day);
      series.push({ date: key, revenueMinor: totals.get(key) ?? 0 });
    }
    return series;
  }

  // --- Staff ---------------------------------------------------------------

  async listStaff(ownerId: string): Promise<StaffMember[]> {
    const store = await this.resolveOwnedStore(ownerId);
    const staff = await this.prisma.user.findMany({
      where: { staffStoreId: store.id, role: UserRole.MERCHANT_STAFF },
      orderBy: { createdAt: 'desc' },
    });
    return staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async inviteStaff(ownerId: string, input: InviteStaffInput): Promise<StaffInviteResult> {
    const store = await this.resolveOwnedStore(ownerId);
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('A user with this email already exists.');

    // Generate a one-time temporary password to share; the staff can reset it later.
    const tempPassword = randomBytes(6).toString('base64url');
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
    const staff = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: UserRole.MERCHANT_STAFF,
        staffStoreId: store.id,
      },
    });
    return {
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        createdAt: staff.createdAt.toISOString(),
      },
      tempPassword,
    };
  }

  async removeStaff(ownerId: string, staffId: string): Promise<void> {
    const store = await this.resolveOwnedStore(ownerId);
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.staffStoreId !== store.id) {
      throw new NotFoundException('Staff member not found.');
    }
    await this.prisma.user.update({ where: { id: staffId }, data: { staffStoreId: null } });
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toStore(store: Store): StoreDto {
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
  };
}
