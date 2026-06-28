import { randomBytes } from 'node:crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingStatus, OrderStatus, StoreStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MerchantService } from './merchant.service';

const HOUR = 60 * 60 * 1000;
const STORE_NAME = 'INTTEST_MERCHANT';
const OWNER_EMAIL = 'merchant-int-owner@test.local';
const CUSTOMER_EMAIL = 'merchant-int-customer@test.local';
const STAFF_EMAIL = 'merchant-int-staff@test.local';

describe('MerchantService (integration)', () => {
  let prisma: PrismaService;
  let service: MerchantService;
  let storeId = '';
  let ownerId = '';
  let customerId = '';
  let listingId = '';

  const emails = [OWNER_EMAIL, CUSTOMER_EMAIL, STAFF_EMAIL];

  async function cleanup(): Promise<void> {
    const stores = await prisma.store.findMany({
      where: { name: STORE_NAME },
      select: { id: true },
    });
    const ids = stores.map((s) => s.id);
    // Detach any staff first so the store can be removed.
    await prisma.user.updateMany({
      where: { staffStoreId: { in: ids } },
      data: { staffStoreId: null },
    });
    await prisma.order.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.store.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }

  async function makeOrder(status: OrderStatus, quantity: number, total: number): Promise<void> {
    await prisma.order.create({
      data: {
        customerId,
        listingId,
        storeId,
        quantity,
        unitPrice: total / quantity,
        totalAmount: total,
        currency: 'EUR',
        status,
        pickupCode: randomBytes(4).toString('hex').toUpperCase(),
      },
    });
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new MerchantService(prisma);
    await cleanup();

    const owner = await prisma.user.create({
      data: { email: OWNER_EMAIL, passwordHash: 'x', name: 'Owner', role: UserRole.MERCHANT_OWNER },
    });
    const customer = await prisma.user.create({
      data: { email: CUSTOMER_EMAIL, passwordHash: 'x', name: 'Customer', role: UserRole.CUSTOMER },
    });
    ownerId = owner.id;
    customerId = customer.id;

    const store = await prisma.store.create({
      data: {
        ownerId,
        name: STORE_NAME,
        category: 'BAKERY',
        address: '1 Test St',
        lat: 21,
        lng: 21,
        currency: 'EUR',
        status: StoreStatus.APPROVED,
      },
    });
    storeId = store.id;

    const now = Date.now();
    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: 'Dashboard Test Bag',
        category: 'BAKERY',
        originalPrice: 1000,
        price: 400,
        quantityTotal: 5,
        quantityRemaining: 3, // 2 sold
        pickupStart: new Date(now), // today
        pickupEnd: new Date(now + 3 * HOUR),
        status: ListingStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    await makeOrder(OrderStatus.COLLECTED, 2, 800);
    await makeOrder(OrderStatus.PAID, 1, 400);
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('dashboard', () => {
    it('summarizes today for the owner', async () => {
      const snapshot = await service.dashboard(ownerId);
      expect(snapshot.activeListings).toBe(1);
      expect(snapshot.ordersToFulfill).toBe(1); // the PAID order
      expect(snapshot.revenueTodayMinor).toBe(1200); // 800 + 400
      expect(snapshot.sellThroughPercent).toBe(40); // 2 of 5
      expect(snapshot.currency).toBe('EUR');
      expect(snapshot.revenueSeries).toHaveLength(7);
    });
  });

  describe('analytics', () => {
    it('computes rescue impact and top listings', async () => {
      const analytics = await service.analytics(ownerId, 14);
      expect(analytics.bagsRescued).toBe(2); // only the COLLECTED order
      expect(analytics.co2KgSaved).toBeCloseTo(5); // 2 * 2.5
      expect(analytics.sellThroughPercent).toBe(40);
      expect(analytics.revenueSeries).toHaveLength(14);
      expect(analytics.topListings[0]?.quantitySold).toBe(3); // 2 + 1
    });

    it('is owner-only', async () => {
      await expect(service.analytics(customerId, 14)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('store profile', () => {
    it('updates editable fields', async () => {
      const updated = await service.updateStore(ownerId, { openingHours: 'Mon–Fri 9–17' });
      expect(updated.openingHours).toBe('Mon–Fri 9–17');
    });
  });

  describe('staff', () => {
    it('invites, lists, resolves, then removes staff', async () => {
      const invite = await service.inviteStaff(ownerId, { email: STAFF_EMAIL, name: 'New Staff' });
      expect(invite.tempPassword).toHaveLength(8);
      expect(invite.staff.email).toBe(STAFF_EMAIL);

      const list = await service.listStaff(ownerId);
      expect(list.map((s) => s.email)).toContain(STAFF_EMAIL);

      // Staff can resolve the store they belong to (for the dashboard/orders).
      const resolved = await service.getStore(invite.staff.id);
      expect(resolved.id).toBe(storeId);

      await service.removeStaff(ownerId, invite.staff.id);
      expect(await service.listStaff(ownerId)).toHaveLength(0);
    });

    it('rejects duplicate emails', async () => {
      await expect(
        service.inviteStaff(ownerId, { email: OWNER_EMAIL, name: 'Dup' }),
      ).rejects.toBeTruthy();
    });

    it('refuses staff resolution for an account with no store', async () => {
      await expect(service.getStore(customerId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
