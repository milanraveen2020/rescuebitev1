import { randomBytes } from 'node:crypto';
import { ListingStatus, OrderStatus, Prisma, StoreStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { EmailService } from '../common/email/email.service';
import { NotificationsService } from './notifications.service';
import type { PushService } from './push.service';
import { NotificationsDispatcher } from './notifications.dispatcher';

const STORE_NAME = 'INTTEST_NOTIF';
const OWNER_EMAIL = 'notif-int-owner@test.local';
const CUSTOMER_EMAIL = 'notif-int-customer@test.local';
const emails = [OWNER_EMAIL, CUSTOMER_EMAIL];

describe('NotificationsDispatcher (event → notification mapping)', () => {
  let prisma: PrismaService;
  let dispatcher: NotificationsDispatcher;
  let push: { sendToUser: jest.Mock };
  let email: {
    sendOrderConfirmation: jest.Mock;
    sendRefundNotice: jest.Mock;
    sendStoreApprovalResult: jest.Mock;
  };
  let ownerId = '';
  let customerId = '';
  let storeId = '';
  let listingId = '';
  let orderId = '';

  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    const stores = await prisma.store.findMany({
      where: { name: STORE_NAME },
      select: { id: true },
    });
    const storeIds = stores.map((s) => s.id);
    await prisma.favorite.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.listing.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    email = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
      sendRefundNotice: jest.fn().mockResolvedValue(undefined),
      sendStoreApprovalResult: jest.fn().mockResolvedValue(undefined),
    };
    dispatcher = new NotificationsDispatcher(
      prisma,
      new NotificationsService(prisma),
      push as unknown as PushService,
      email as unknown as EmailService,
    );
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
        address: '1 St',
        lat: 24,
        lng: 24,
        status: StoreStatus.APPROVED,
      },
    });
    storeId = store.id;
    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: 'Notif Bag',
        category: 'BAKERY',
        originalPrice: 1000,
        price: 400,
        quantityTotal: 5,
        quantityRemaining: 4,
        pickupStart: new Date(Date.now() + 60 * 60 * 1000),
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
        quantity: 1,
        unitPrice: 400,
        totalAmount: 400,
        currency: 'EUR',
        status: OrderStatus.PAID,
        pickupCode: randomBytes(4).toString('hex').toUpperCase(),
      },
    });
    orderId = order.id;
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  beforeEach(() => jest.clearAllMocks());

  function payload() {
    return { orderId, customerId, storeId, listingId, status: OrderStatus.PAID };
  }

  it('order.paid notifies the customer (inbox + push + email) and the merchant', async () => {
    await dispatcher.handleOrderPaid(payload());

    const customerNotif = await prisma.notification.findFirst({
      where: { userId: customerId, type: 'ORDER_PAID' },
    });
    expect(customerNotif?.data).toMatchObject({ orderId });
    const merchantNotif = await prisma.notification.findFirst({
      where: { userId: ownerId, type: 'NEW_ORDER' },
    });
    expect(merchantNotif).not.toBeNull();
    expect(email.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(push.sendToUser).toHaveBeenCalledWith(
      customerId,
      expect.objectContaining({ title: expect.any(String) }),
    );
  });

  it('is idempotent — re-delivering order.paid creates no duplicate row or email', async () => {
    await dispatcher.handleOrderPaid(payload());
    const count = await prisma.notification.count({
      where: { userId: customerId, type: 'ORDER_PAID' },
    });
    expect(count).toBe(1);
    expect(email.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('respects preferences — opting out of order updates suppresses delivery', async () => {
    await prisma.user.update({
      where: { id: customerId },
      data: { notificationPrefs: { orderUpdates: false } },
    });
    await dispatcher.handleOrderCollected(payload());
    const collected = await prisma.notification.count({
      where: { userId: customerId, type: 'ORDER_COLLECTED' },
    });
    expect(collected).toBe(0);
    expect(push.sendToUser).not.toHaveBeenCalled();
    // Reset to platform defaults so later cases aren't suppressed.
    await prisma.user.update({
      where: { id: customerId },
      data: { notificationPrefs: Prisma.DbNull },
    });
  });

  it('order.refunded sends a refund notice', async () => {
    await dispatcher.handleOrderRefunded(payload());
    const refunded = await prisma.notification.findFirst({
      where: { userId: customerId, type: 'ORDER_REFUNDED' },
    });
    expect(refunded).not.toBeNull();
    expect(email.sendRefundNotice).toHaveBeenCalledTimes(1);
  });

  it('store.approved notifies the owner and emails them', async () => {
    await dispatcher.handleStoreDecision({ storeId, ownerId }, true);
    const approved = await prisma.notification.findFirst({
      where: { userId: ownerId, type: 'STORE_APPROVED' },
    });
    expect(approved).not.toBeNull();
    expect(email.sendStoreApprovalResult).toHaveBeenCalledWith(
      expect.objectContaining({ approved: true }),
    );
  });

  it('listing.published notifies users who favorited the store', async () => {
    await prisma.favorite.create({ data: { userId: customerId, storeId } });
    await dispatcher.handleListingPublished({ listingId, storeId });
    const newListing = await prisma.notification.findFirst({
      where: { userId: customerId, type: 'NEW_LISTING' },
    });
    expect(newListing?.data).toMatchObject({ listingId });
  });
});
