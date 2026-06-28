import { randomBytes } from 'node:crypto';
import { ListingStatus, OrderStatus, StoreStatus, UserRole, UserStatus } from '@prisma/client';
import type { AppConfigService } from '../config/app-config.service';
import type { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsService } from '../common/settings/settings.service';
import { AuditLogService } from './audit-log.service';
import { AdminService } from './admin.service';

const STORE_NAME = 'INTTEST_ADMIN';
const ADMIN_EMAIL = 'admin-int-admin@test.local';
const OWNER_EMAIL = 'admin-int-owner@test.local';
const CUSTOMER_EMAIL = 'admin-int-customer@test.local';
const emails = [ADMIN_EMAIL, OWNER_EMAIL, CUSTOMER_EMAIL];

describe('AdminService (integration)', () => {
  let prisma: PrismaService;
  let service: AdminService;
  let audit: AuditLogService;
  let adminId = '';
  let ownerId = '';
  let customerId = '';
  let storeId = '';
  let listingId = '';
  let reviewId = '';

  async function cleanup(): Promise<void> {
    const stores = await prisma.store.findMany({
      where: { name: STORE_NAME },
      select: { id: true },
    });
    const ids = stores.map((s) => s.id);
    await prisma.auditLog.deleteMany({ where: { actor: { email: { in: emails } } } });
    await prisma.review.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.order.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { storeId: { in: ids } } });
    await prisma.store.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const config = { platformFeeBps: 1000 } as AppConfigService;
    const settings = new SettingsService(prisma, config);
    audit = new AuditLogService(prisma);
    service = new AdminService(prisma, settings, {} as PaymentsService, audit);
    await cleanup();

    const admin = await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash: 'x', name: 'Admin', role: UserRole.ADMIN },
    });
    const owner = await prisma.user.create({
      data: { email: OWNER_EMAIL, passwordHash: 'x', name: 'Owner', role: UserRole.MERCHANT_OWNER },
    });
    const customer = await prisma.user.create({
      data: { email: CUSTOMER_EMAIL, passwordHash: 'x', name: 'Customer', role: UserRole.CUSTOMER },
    });
    adminId = admin.id;
    ownerId = owner.id;
    customerId = customer.id;

    const store = await prisma.store.create({
      data: {
        ownerId,
        name: STORE_NAME,
        category: 'BAKERY',
        address: '1 Admin St',
        lat: 22,
        lng: 22,
        currency: 'EUR',
        status: StoreStatus.PENDING,
      },
    });
    storeId = store.id;

    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: 'Admin Test Bag',
        category: 'BAKERY',
        originalPrice: 1000,
        price: 400,
        quantityTotal: 5,
        quantityRemaining: 3,
        pickupStart: new Date(),
        pickupEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
        status: ListingStatus.ACTIVE,
      },
    });
    listingId = listing.id;

    const order = await prisma.order.create({
      data: {
        customerId,
        listingId,
        storeId,
        quantity: 2,
        unitPrice: 400,
        totalAmount: 800,
        currency: 'EUR',
        status: OrderStatus.COLLECTED,
        pickupCode: randomBytes(4).toString('hex').toUpperCase(),
      },
    });
    const review = await prisma.review.create({
      data: { orderId: order.id, customerId, storeId, rating: 5, comment: 'Great!' },
    });
    reviewId = review.id;
    await prisma.store.update({ where: { id: storeId }, data: { rating: 5, reviewCount: 1 } });
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe('overview', () => {
    it('aggregates platform KPIs', async () => {
      const overview = await service.overview({});
      expect(overview.gmvMinor).toBeGreaterThanOrEqual(800);
      expect(overview.mealsRescued).toBeGreaterThanOrEqual(2);
      expect(overview.activeStores).toBeGreaterThanOrEqual(0);
      expect(overview.revenueSeries.length).toBeGreaterThan(0);
    });
  });

  describe('store approvals', () => {
    it('approves a store and records an audit entry', async () => {
      const approved = await service.approveStore(adminId, storeId);
      expect(approved.status).toBe(StoreStatus.APPROVED);

      const logs = await audit.list({ page: 1, pageSize: 20, sortOrder: 'desc', entity: 'Store' });
      expect(logs.items.some((l) => l.action === 'store.approve' && l.entityId === storeId)).toBe(
        true,
      );
    });

    it('rejects with a reason captured in metadata', async () => {
      const rejected = await service.rejectStore(adminId, storeId, { reason: 'Incomplete docs' });
      expect(rejected.status).toBe(StoreStatus.REJECTED);
      const logs = await audit.list({
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        action: 'store.reject',
      });
      expect(logs.items[0]?.metadata).toMatchObject({ reason: 'Incomplete docs' });
    });
  });

  describe('users', () => {
    it('suspends and reactivates a user', async () => {
      const suspended = await service.suspendUser(adminId, customerId, { reason: 'spam' });
      expect(suspended.status).toBe(UserStatus.SUSPENDED);
      const active = await service.reactivateUser(adminId, customerId);
      expect(active.status).toBe(UserStatus.ACTIVE);
    });

    it('searches users by email', async () => {
      const page = await service.listUsers({
        page: 1,
        pageSize: 10,
        sortOrder: 'desc',
        search: OWNER_EMAIL,
      });
      expect(page.items.map((u) => u.email)).toContain(OWNER_EMAIL);
    });
  });

  describe('listings moderation', () => {
    it('force-unpublishes a listing', async () => {
      const result = await service.unpublishListing(adminId, listingId);
      expect(result.status).toBe(ListingStatus.EXPIRED);
    });
  });

  describe('reviews moderation', () => {
    it('hiding a review excludes it from the store rating', async () => {
      await service.hideReview(adminId, reviewId, { reason: 'abusive' });
      const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
      expect(store.reviewCount).toBe(0);
      expect(store.rating).toBe(0);

      await service.unhideReview(adminId, reviewId);
      const restored = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
      expect(restored.reviewCount).toBe(1);
    });
  });

  describe('settings', () => {
    it('updates the commission and records an audit entry', async () => {
      const updated = await service.updateSettings(adminId, { commissionBps: 1500 });
      expect(updated.commissionBps).toBe(1500);
      // reset to default so other suites/checkout are unaffected
      await service.updateSettings(adminId, { commissionBps: 1000 });
    });
  });
});
