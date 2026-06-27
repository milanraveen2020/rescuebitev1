import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListingStatus, OrderStatus, StoreStatus } from '@prisma/client';
import type { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrdersService } from './orders.service';

const HOUR = 60 * 60 * 1000;
const STORE_NAME = 'INTTEST_ORDERS';
const OWNER_EMAIL = 'order-int-owner@test.local';
const CUSTOMER_EMAIL = 'order-int-customer@test.local';

describe('OrdersService (integration)', () => {
  let prisma: PrismaService;
  let events: EventEmitter2;
  let service: OrdersService;
  let storeId = '';
  let ownerId = '';
  let customerId = '';

  async function cleanup(): Promise<void> {
    const stores = await prisma.store.findMany({
      where: { name: STORE_NAME },
      select: { id: true },
    });
    const ids = stores.map((s) => s.id);
    await prisma.review.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.order.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.store.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { in: [OWNER_EMAIL, CUSTOMER_EMAIL] } } });
  }

  async function makeListing(quantity: number, pickupEnd?: Date): Promise<string> {
    const now = Date.now();
    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: 'Order Test Bag',
        category: 'BAKERY',
        originalPrice: 1000,
        price: 400,
        quantityTotal: quantity,
        quantityRemaining: quantity,
        pickupStart: new Date(now - HOUR),
        pickupEnd: pickupEnd ?? new Date(now + 3 * HOUR),
        status: ListingStatus.ACTIVE,
      },
    });
    return listing.id;
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    events = new EventEmitter2();
    service = new OrdersService(
      prisma,
      { reservationHoldMinutes: 15 } as AppConfigService,
      events,
    );
    await cleanup();
    const owner = await prisma.user.create({
      data: { email: OWNER_EMAIL, passwordHash: 'x', name: 'Owner', role: 'MERCHANT_OWNER' },
    });
    const customer = await prisma.user.create({
      data: { email: CUSTOMER_EMAIL, passwordHash: 'x', name: 'Customer', role: 'CUSTOMER' },
    });
    ownerId = owner.id;
    customerId = customer.id;
    const store = await prisma.store.create({
      data: {
        ownerId,
        name: STORE_NAME,
        category: 'BAKERY',
        address: '1 Test St',
        // Far from the listings-discovery spec fixtures (10,10) to avoid
        // cross-file pollution when jest runs specs in parallel.
        lat: 20,
        lng: 20,
        status: StoreStatus.APPROVED,
      },
    });
    storeId = store.id;
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('overselling guard (concurrency)', () => {
    it('never sells more than the available stock under concurrent reservations', async () => {
      const STOCK = 5;
      const ATTEMPTS = 12;
      const listingId = await makeListing(STOCK);

      const results = await Promise.allSettled(
        Array.from({ length: ATTEMPTS }, () => service.reserve(customerId, { listingId, quantity: 1 })),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      expect(succeeded).toBe(STOCK);

      const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
      expect(listing.quantityRemaining).toBe(0);
      expect(listing.status).toBe(ListingStatus.SOLD_OUT);

      const orders = await prisma.order.count({ where: { listingId } });
      expect(orders).toBe(STOCK);
    }, 30_000);

    it('rejects reserving more than the remaining quantity', async () => {
      const listingId = await makeListing(2);
      await expect(service.reserve(customerId, { listingId, quantity: 3 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('lifecycle', () => {
    it('reserve → pay → collect with the correct pickup code', async () => {
      const listingId = await makeListing(3);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      expect(reserved.status).toBe('RESERVED');
      expect(reserved.reservationExpiresAt).not.toBeNull();

      const paid = await service.pay(customerId, reserved.id);
      expect(paid.status).toBe('PAID');
      expect(paid.reservationExpiresAt).toBeNull();

      const collected = await service.collect(ownerId, reserved.id, reserved.pickupCode);
      expect(collected.status).toBe('COLLECTED');
      expect(collected.collectedAt).not.toBeNull();
    });

    it('rejects collection with a wrong pickup code', async () => {
      const listingId = await makeListing(3);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      await service.pay(customerId, reserved.id);
      await expect(service.collect(ownerId, reserved.id, 'WRONG1')).rejects.toThrow();
      const order = await prisma.order.findUniqueOrThrow({ where: { id: reserved.id } });
      expect(order.status).toBe(OrderStatus.PAID);
    });

    it('cancel restores stock', async () => {
      const listingId = await makeListing(1);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      const afterReserve = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
      expect(afterReserve.quantityRemaining).toBe(0);
      expect(afterReserve.status).toBe(ListingStatus.SOLD_OUT);

      await service.cancel(customerId, reserved.id);
      const afterCancel = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
      expect(afterCancel.quantityRemaining).toBe(1);
      expect(afterCancel.status).toBe(ListingStatus.ACTIVE); // re-opened
    });

    it('auto-releases expired reservations and restores stock', async () => {
      const listingId = await makeListing(2);
      const reserved = await service.reserve(customerId, { listingId, quantity: 2 });
      // Force the hold to have already expired.
      await prisma.order.update({
        where: { id: reserved.id },
        data: { reservationExpiresAt: new Date(Date.now() - 1000) },
      });

      const released = await service.releaseExpiredReservations();
      expect(released).toBeGreaterThanOrEqual(1);

      const order = await prisma.order.findUniqueOrThrow({ where: { id: reserved.id } });
      expect(order.status).toBe(OrderStatus.CANCELLED);
      const listing = await prisma.listing.findUniqueOrThrow({ where: { id: listingId } });
      expect(listing.quantityRemaining).toBe(2);
    });

    it('marks a paid order as NO_SHOW after the pickup window closes', async () => {
      const listingId = await makeListing(1);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      await service.pay(customerId, reserved.id);
      // Close the pickup window.
      await prisma.listing.update({
        where: { id: listingId },
        data: { pickupEnd: new Date(Date.now() - HOUR) },
      });
      const result = await service.markNoShow(ownerId, reserved.id);
      expect(result.status).toBe('NO_SHOW');
    });
  });

  describe('reviews', () => {
    async function makeCollectedOrder(): Promise<string> {
      const listingId = await makeListing(1);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      await service.pay(customerId, reserved.id);
      await service.collect(ownerId, reserved.id, reserved.pickupCode);
      return reserved.id;
    }

    it('allows reviewing a collected order exactly once', async () => {
      const orderId = await makeCollectedOrder();
      const review = await service.review(customerId, orderId, { rating: 5, comment: 'Great!' });
      expect(review.rating).toBe(5);

      await expect(
        service.review(customerId, orderId, { rating: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects reviewing a non-collected order', async () => {
      const listingId = await makeListing(1);
      const reserved = await service.reserve(customerId, { listingId, quantity: 1 });
      await expect(
        service.review(customerId, reserved.id, { rating: 5 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('domain events', () => {
    it('emits an event on reservation', async () => {
      const seen: string[] = [];
      const handler = (payload: { orderId: string }): void => {
        void payload;
        seen.push('order.reserved');
      };
      events.on('order.reserved', handler);
      const listingId = await makeListing(1);
      await service.reserve(customerId, { listingId, quantity: 1 });
      events.off('order.reserved', handler);
      expect(seen).toContain('order.reserved');
    });
  });
});
