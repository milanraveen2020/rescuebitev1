import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma, StoreStatus, type Listing as DbListing, type Store } from '@prisma/client';
import type {
  CreateListingInput,
  Listing,
  ListingDetail,
  NearbyListing,
  NearbyListingPage,
  NearbyQuery,
  StoreSummary,
  UpdateListingInput,
} from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';

type ListingWithStore = DbListing & { store: Store };

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Merchant CRUD (scoped to the caller's own store) --------------------

  async create(ownerId: string, input: CreateListingInput): Promise<Listing> {
    const store = await this.requireOwnedStore(ownerId);
    const pickupEnd = new Date(input.pickupEnd);
    const listing = await this.prisma.listing.create({
      data: {
        storeId: store.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        originalPrice: input.originalPrice,
        price: input.price,
        quantityTotal: input.quantityTotal,
        quantityRemaining: input.quantityTotal,
        pickupStart: new Date(input.pickupStart),
        pickupEnd,
        imageUrl: input.imageUrl ?? null,
        allergenInfo: input.allergenInfo ?? null,
        status: normalizeStatus(input.status, pickupEnd, input.quantityTotal),
      },
      include: { store: true },
    });
    return toListing(listing);
  }

  async update(ownerId: string, listingId: string, input: UpdateListingInput): Promise<Listing> {
    const existing = await this.requireOwnedListing(ownerId, listingId);

    const originalPrice = input.originalPrice ?? existing.originalPrice;
    const price = input.price ?? existing.price;
    if (price > originalPrice) {
      throw new BadRequestException('Discounted price cannot exceed the original price.');
    }
    const pickupStart = input.pickupStart ? new Date(input.pickupStart) : existing.pickupStart;
    const pickupEnd = input.pickupEnd ? new Date(input.pickupEnd) : existing.pickupEnd;
    if (pickupStart >= pickupEnd) {
      throw new BadRequestException('Pickup start must be before pickup end.');
    }

    const quantityTotal = input.quantityTotal ?? existing.quantityTotal;
    const quantityRemaining = input.quantityRemaining ?? existing.quantityRemaining;
    if (quantityRemaining > quantityTotal) {
      throw new BadRequestException('Remaining quantity cannot exceed total quantity.');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        title: input.title ?? undefined,
        description: input.description ?? undefined,
        category: input.category ?? undefined,
        originalPrice,
        price,
        quantityTotal,
        quantityRemaining,
        pickupStart,
        pickupEnd,
        imageUrl: input.imageUrl ?? undefined,
        allergenInfo: input.allergenInfo ?? undefined,
        status: normalizeStatus(input.status ?? existing.status, pickupEnd, quantityRemaining),
      },
      include: { store: true },
    });
    return toListing(updated);
  }

  async remove(ownerId: string, listingId: string): Promise<void> {
    await this.requireOwnedListing(ownerId, listingId);
    await this.prisma.listing.delete({ where: { id: listingId } });
  }

  async listOwn(ownerId: string): Promise<Listing[]> {
    const store = await this.requireOwnedStore(ownerId);
    const listings = await this.prisma.listing.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      include: { store: true },
    });
    return listings.map(toListing);
  }

  async getOwn(ownerId: string, listingId: string): Promise<Listing> {
    return toListing(await this.requireOwnedListing(ownerId, listingId));
  }

  // --- Customer-facing discovery -------------------------------------------

  /** Full public detail for one listing (not drafts; store must be approved). */
  async getPublicDetail(listingId: string): Promise<ListingDetail> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { store: true },
    });
    if (
      !listing ||
      listing.status === ListingStatus.DRAFT ||
      listing.store.status !== StoreStatus.APPROVED
    ) {
      throw new NotFoundException('That surprise bag could not be found.');
    }
    const { store, ...rest } = listing;
    return { ...toListing({ ...rest, store }), store: toStoreSummary(store) };
  }

  /**
   * Nearby ACTIVE listings within `radiusKm`, with distance, store info, and
   * remaining quantity. Keyset (cursor) paginated by the selected sort key.
   */
  async findNearby(query: NearbyQuery): Promise<NearbyListingPage> {
    // Prisma stores DateTime as `timestamp` (no tz) holding the UTC wall-clock,
    // so compare against the current UTC instant (raw now() is session-local tz).
    const nowUtc = Prisma.sql`(now() AT TIME ZONE 'UTC')`;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`l.status = ${ListingStatus.ACTIVE}::"ListingStatus"`,
      Prisma.sql`s.status = ${StoreStatus.APPROVED}::"StoreStatus"`,
      Prisma.sql`l."pickupEnd" > ${nowUtc}`,
      Prisma.sql`l."quantityRemaining" > 0`,
    ];
    if (query.category) {
      conditions.push(Prisma.sql`l.category = ${query.category}::"FoodCategory"`);
    }
    if (query.minPrice !== undefined) conditions.push(Prisma.sql`l.price >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) conditions.push(Prisma.sql`l.price <= ${query.maxPrice}`);
    if (query.availableNow) {
      conditions.push(Prisma.sql`l."pickupStart" <= ${nowUtc} AND l."pickupEnd" >= ${nowUtc}`);
    }

    const distanceSql = Prisma.sql`(6371 * acos(LEAST(1, GREATEST(-1,
      cos(radians(${query.lat})) * cos(radians(s.lat)) * cos(radians(s.lng) - radians(${query.lng}))
      + sin(radians(${query.lat})) * sin(radians(s.lat))))))`;

    const sortKeyExpr = this.sortKeyExpr(query.sort, distanceSql);
    const cursor = decodeCursor(query.cursor);
    const cursorClause = cursor
      ? Prisma.sql`AND (${sortKeyExpr} > ${cursor.k} OR (${sortKeyExpr} = ${cursor.k} AND l.id > ${cursor.id}))`
      : Prisma.empty;

    const rowsQuery = Prisma.sql`
      SELECT
        l.id, l."storeId", l.title, l.description, l.category, l."originalPrice", l.price,
        l."quantityTotal", l."quantityRemaining", l."pickupStart", l."pickupEnd",
        l."imageUrl", l."allergenInfo", l.status, l."createdAt", l."updatedAt",
        ${distanceSql} AS distance_km,
        s.id AS store_id, s.name AS store_name, s.category AS store_category,
        s.address AS store_address, s.lat AS store_lat, s.lng AS store_lng,
        s."logoUrl" AS store_logo_url, s.rating AS store_rating,
        s."reviewCount" AS store_review_count, s.currency AS store_currency
      FROM "Listing" l
      JOIN "Store" s ON s.id = l."storeId"
      WHERE ${Prisma.join(conditions, ' AND ')}
        AND ${distanceSql} <= ${query.radiusKm}
        ${cursorClause}
      ORDER BY ${sortKeyExpr} ASC, l.id ASC
      LIMIT ${query.limit + 1}
    `;
    const rows = await this.prisma.$queryRaw<NearbyRow[]>(rowsQuery);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const items = page.map((row) => toNearbyListing(row));
    const lastRow = page.at(-1);
    const nextCursor =
      hasMore && lastRow
        ? encodeCursor({ k: this.sortKeyValue(query.sort, lastRow), id: lastRow.id })
        : null;

    return { items, nextCursor, hasMore };
  }

  // --- Inventory lifecycle -------------------------------------------------

  /** Expire listings past their pickup window and mark out-of-stock ones sold out. */
  async runLifecycleSweep(): Promise<{ expired: number; soldOut: number }> {
    const now = new Date();
    const soldOut = await this.prisma.listing.updateMany({
      where: { status: ListingStatus.ACTIVE, quantityRemaining: { lte: 0 } },
      data: { status: ListingStatus.SOLD_OUT },
    });
    const expired = await this.prisma.listing.updateMany({
      where: { status: { in: [ListingStatus.ACTIVE, ListingStatus.SOLD_OUT] }, pickupEnd: { lt: now } },
      data: { status: ListingStatus.EXPIRED },
    });
    return { expired: expired.count, soldOut: soldOut.count };
  }

  // --- helpers -------------------------------------------------------------

  private sortKeyExpr(sort: NearbyQuery['sort'], distanceSql: Prisma.Sql): Prisma.Sql {
    switch (sort) {
      case 'price':
        return Prisma.sql`l.price`;
      case 'ending_soon':
        return Prisma.sql`(extract(epoch from l."pickupEnd") * 1000)`;
      case 'distance':
      default:
        return distanceSql;
    }
  }

  private sortKeyValue(sort: NearbyQuery['sort'], row: NearbyRow): number {
    switch (sort) {
      case 'price':
        return Number(row.price);
      case 'ending_soon':
        return new Date(row.pickupEnd).getTime();
      case 'distance':
      default:
        return Number(row.distance_km);
    }
  }

  private async requireOwnedStore(ownerId: string): Promise<Store> {
    const store = await this.prisma.store.findFirst({ where: { ownerId } });
    if (!store) {
      throw new ForbiddenException('You need an approved store before managing listings.');
    }
    return store;
  }

  private async requireOwnedListing(ownerId: string, listingId: string): Promise<ListingWithStore> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { store: true },
    });
    // Return 404 (not 403) so we don't reveal other stores' listing ids.
    if (!listing || listing.store.ownerId !== ownerId) {
      throw new NotFoundException('Listing not found.');
    }
    return listing;
  }
}

/** Raw row returned by the nearby query. */
interface NearbyRow {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  category: string;
  originalPrice: number;
  price: number;
  quantityTotal: number;
  quantityRemaining: number;
  pickupStart: Date;
  pickupEnd: Date;
  imageUrl: string | null;
  allergenInfo: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  distance_km: number;
  store_id: string;
  store_name: string;
  store_category: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  store_logo_url: string | null;
  store_rating: number;
  store_review_count: number;
  store_currency: string;
}

function discountPercent(originalPrice: number, price: number): number {
  if (originalPrice <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((1 - price / originalPrice) * 100)));
}

function normalizeStatus(
  status: ListingStatus,
  pickupEnd: Date,
  quantityRemaining: number,
): ListingStatus {
  if (status === ListingStatus.DRAFT) return ListingStatus.DRAFT;
  if (quantityRemaining <= 0) return ListingStatus.SOLD_OUT;
  if (pickupEnd.getTime() <= Date.now()) return ListingStatus.EXPIRED;
  return status;
}

function toListing(listing: ListingWithStore): Listing {
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
    discountPercent: discountPercent(listing.originalPrice, listing.price),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function toStoreSummary(store: Store): StoreSummary {
  return {
    id: store.id,
    name: store.name,
    category: store.category,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    logoUrl: store.logoUrl,
    rating: store.rating,
    reviewCount: store.reviewCount,
  };
}

function toNearbyListing(row: NearbyRow): NearbyListing {
  return {
    id: row.id,
    storeId: row.storeId,
    title: row.title,
    description: row.description,
    category: row.category as NearbyListing['category'],
    originalPrice: Number(row.originalPrice),
    price: Number(row.price),
    currency: row.store_currency,
    quantityTotal: Number(row.quantityTotal),
    quantityRemaining: Number(row.quantityRemaining),
    pickupStart: new Date(row.pickupStart).toISOString(),
    pickupEnd: new Date(row.pickupEnd).toISOString(),
    imageUrl: row.imageUrl,
    allergenInfo: row.allergenInfo,
    status: row.status as NearbyListing['status'],
    discountPercent: discountPercent(Number(row.originalPrice), Number(row.price)),
    distanceKm: Math.round(Number(row.distance_km) * 100) / 100,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    store: {
      id: row.store_id,
      name: row.store_name,
      category: row.store_category as StoreSummary['category'],
      address: row.store_address,
      lat: Number(row.store_lat),
      lng: Number(row.store_lng),
      logoUrl: row.store_logo_url,
      rating: Number(row.store_rating),
      reviewCount: Number(row.store_review_count),
    },
  };
}

interface Cursor {
  k: number;
  id: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Cursor).k === 'number' &&
      typeof (parsed as Cursor).id === 'string'
    ) {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}
