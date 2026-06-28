import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListingStatus, StoreStatus, type FoodCategory } from '@prisma/client';
import type { NearbyQuery } from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { ListingsService } from './listings.service';

/**
 * Integration tests against the local Postgres (rescuebite_dev). Fixtures live at
 * an isolated coordinate (10,10) far from the seed data, so nearby queries only
 * see this test's listings. Created rows are cleaned up before and after.
 */
const HOUR = 60 * 60 * 1000;
const STORE_PREFIX = 'INTTEST_LISTINGS';
const OWNER_PREFIX = 'listing-int-';

function nearbyQuery(overrides: Partial<NearbyQuery>): NearbyQuery {
  return { lat: 10, lng: 10, radiusKm: 5, sort: 'distance', limit: 20, ...overrides };
}

describe('ListingsService (integration)', () => {
  let prisma: PrismaService;
  let service: ListingsService;
  const store: Record<'near' | 'mid' | 'far', string> = { near: '', mid: '', far: '' };
  const owner: Record<'near' | 'mid' | 'far', string> = { near: '', mid: '', far: '' };

  async function cleanup(): Promise<void> {
    const stores = await prisma.store.findMany({
      where: { name: { startsWith: STORE_PREFIX } },
      select: { id: true },
    });
    const ids = stores.map((s) => s.id);
    await prisma.listing.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.store.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: OWNER_PREFIX } } });
  }

  async function makeStore(key: 'near' | 'mid' | 'far', lat: number, lng: number): Promise<void> {
    const user = await prisma.user.create({
      data: {
        email: `${OWNER_PREFIX}${key}@test.local`,
        passwordHash: 'x',
        name: `${key} owner`,
        role: 'MERCHANT_OWNER',
      },
    });
    const created = await prisma.store.create({
      data: {
        ownerId: user.id,
        name: `${STORE_PREFIX} ${key}`,
        category: 'BAKERY',
        address: '1 Test St',
        lat,
        lng,
        status: StoreStatus.APPROVED,
      },
    });
    owner[key] = user.id;
    store[key] = created.id;
  }

  async function makeListing(
    storeId: string,
    overrides: Partial<{
      title: string;
      category: FoodCategory;
      price: number;
      status: ListingStatus;
      quantityRemaining: number;
      pickupStart: Date;
      pickupEnd: Date;
    }>,
  ): Promise<string> {
    const now = Date.now();
    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: overrides.title ?? 'Test Bag',
        category: overrides.category ?? 'GROCERY',
        originalPrice: 1000,
        price: overrides.price ?? 500,
        quantityTotal: 5,
        quantityRemaining: overrides.quantityRemaining ?? 5,
        pickupStart: overrides.pickupStart ?? new Date(now - HOUR),
        pickupEnd: overrides.pickupEnd ?? new Date(now + 3 * HOUR),
        status: overrides.status ?? ListingStatus.ACTIVE,
      },
    });
    return listing.id;
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new ListingsService(prisma, new EventEmitter2());
    await cleanup();

    await makeStore('near', 10, 10);
    await makeStore('mid', 10.02, 10); // ~2.2 km away
    await makeStore('far', 10.1, 10); // ~11 km away

    await makeListing(store.near, { title: 'Near Bakery', category: 'BAKERY', price: 500 });
    await makeListing(store.near, { title: 'Near Grocery', category: 'GROCERY', price: 800 });
    await makeListing(store.mid, { title: 'Mid Grocery', category: 'GROCERY', price: 300 });
    await makeListing(store.far, { title: 'Far Grocery', price: 400 });
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('discovery', () => {
    it('returns active listings within the radius with distance + store info', async () => {
      const page = await service.findNearby(nearbyQuery({}));
      const titles = page.items.map((i) => i.title).sort();
      expect(titles).toEqual(['Mid Grocery', 'Near Bakery', 'Near Grocery']);

      const near = page.items.find((i) => i.title === 'Near Bakery');
      expect(near?.distanceKm).toBeLessThan(0.5);
      expect(near?.store.name).toContain(STORE_PREFIX);
      expect(near?.quantityRemaining).toBe(5);
      expect(near?.discountPercent).toBe(50); // 500 of 1000
    });

    it('excludes the far store beyond the radius', async () => {
      const page = await service.findNearby(nearbyQuery({}));
      expect(page.items.some((i) => i.title === 'Far Grocery')).toBe(false);
    });

    it('orders by distance (closest first) by default', async () => {
      const page = await service.findNearby(nearbyQuery({}));
      expect(page.items[page.items.length - 1]?.title).toBe('Mid Grocery');
    });

    it('sorts by price ascending', async () => {
      const page = await service.findNearby(nearbyQuery({ sort: 'price' }));
      expect(page.items.map((i) => i.price)).toEqual([300, 500, 800]);
    });

    it('filters by category', async () => {
      const page = await service.findNearby(nearbyQuery({ category: 'BAKERY' }));
      expect(page.items.map((i) => i.title)).toEqual(['Near Bakery']);
    });

    it('filters by price range', async () => {
      const page = await service.findNearby(nearbyQuery({ minPrice: 400, maxPrice: 600 }));
      expect(page.items.map((i) => i.title)).toEqual(['Near Bakery']);
    });

    it('cursor-paginates without overlap', async () => {
      const first = await service.findNearby(nearbyQuery({ sort: 'price', limit: 2 }));
      expect(first.items).toHaveLength(2);
      expect(first.hasMore).toBe(true);
      expect(first.nextCursor).toBeTruthy();

      const second = await service.findNearby(
        nearbyQuery({ sort: 'price', limit: 2, cursor: first.nextCursor ?? undefined }),
      );
      expect(second.items).toHaveLength(1);
      expect(second.hasMore).toBe(false);

      const allIds = [...first.items, ...second.items].map((i) => i.id);
      expect(new Set(allIds).size).toBe(3);
    });
  });

  describe('inventory lifecycle', () => {
    it('sweeps past-window listings to EXPIRED and out-of-stock to SOLD_OUT', async () => {
      const now = Date.now();
      const expiredId = await makeListing(store.near, {
        title: 'Sweep Expired',
        pickupEnd: new Date(now - HOUR),
        status: ListingStatus.ACTIVE,
      });
      const soldOutId = await makeListing(store.near, {
        title: 'Sweep SoldOut',
        quantityRemaining: 0,
        status: ListingStatus.ACTIVE,
      });

      const result = await service.runLifecycleSweep();
      expect(result.expired).toBeGreaterThanOrEqual(1);
      expect(result.soldOut).toBeGreaterThanOrEqual(1);

      const expired = await prisma.listing.findUnique({ where: { id: expiredId } });
      const soldOut = await prisma.listing.findUnique({ where: { id: soldOutId } });
      expect(expired?.status).toBe(ListingStatus.EXPIRED);
      expect(soldOut?.status).toBe(ListingStatus.SOLD_OUT);
    });

    it('normalizes status on create (past pickup window -> EXPIRED)', async () => {
      const now = Date.now();
      const listing = await service.create(owner.near, {
        title: 'Created Expired',
        category: 'GROCERY',
        originalPrice: 1000,
        price: 500,
        quantityTotal: 3,
        pickupStart: new Date(now - 3 * HOUR).toISOString(),
        pickupEnd: new Date(now - HOUR).toISOString(),
        status: 'ACTIVE',
      });
      expect(listing.status).toBe('EXPIRED');
    });

    it('normalizes status on update (quantityRemaining 0 -> SOLD_OUT)', async () => {
      const created = await service.create(owner.near, {
        title: 'Created Active',
        category: 'GROCERY',
        originalPrice: 1000,
        price: 500,
        quantityTotal: 3,
        pickupStart: new Date(Date.now() - HOUR).toISOString(),
        pickupEnd: new Date(Date.now() + 3 * HOUR).toISOString(),
        status: 'ACTIVE',
      });
      const updated = await service.update(owner.near, created.id, { quantityRemaining: 0 });
      expect(updated.status).toBe('SOLD_OUT');
    });
  });
});
