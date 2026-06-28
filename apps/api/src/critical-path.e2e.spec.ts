import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ListingStatus, StoreStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';

/**
 * End-to-end test of the critical customer path over real HTTP, exercising the
 * controllers, guards, validation pipe, and exception filter together:
 *
 *   register → browse (nearby) → reserve → pay → collect → review
 *
 * Payment uses the sandbox `POST /orders/:id/pay` (no live Stripe), which is the
 * intended path for environments without Stripe keys (e.g. CI).
 */
const SUFFIX = randomBytes(4).toString('hex');
const STORE_NAME = `E2E Store ${SUFFIX}`;
const MERCHANT_EMAIL = `e2e-merchant-${SUFFIX}@test.local`;
const CUSTOMER_EMAIL = `e2e-customer-${SUFFIX}@test.local`;
const PASSWORD = 'Password123!';
// Isolated coordinate, away from seed + other specs' fixtures.
const LAT = 11.111;
const LNG = 11.111;

describe('Critical path (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storeId = '';
  let listingId = '';
  let merchantToken = '';
  let customerToken = '';
  let orderId = '';
  let pickupCode = '';

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
    await prisma.user.deleteMany({ where: { email: { in: [MERCHANT_EMAIL, CUSTOMER_EMAIL] } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    // Fixtures: an approved merchant store with one active, in-stock listing.
    const merchant = await prisma.user.create({
      data: {
        email: MERCHANT_EMAIL,
        passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
        name: 'E2E Merchant',
        role: UserRole.MERCHANT_OWNER,
      },
    });
    const store = await prisma.store.create({
      data: {
        ownerId: merchant.id,
        name: STORE_NAME,
        category: 'BAKERY',
        address: '1 E2E Street',
        lat: LAT,
        lng: LNG,
        currency: 'EUR',
        status: StoreStatus.APPROVED,
      },
    });
    storeId = store.id;
    const listing = await prisma.listing.create({
      data: {
        storeId,
        title: 'E2E Surprise Bag',
        category: 'BAKERY',
        originalPrice: 1500,
        price: 500,
        quantityTotal: 5,
        quantityRemaining: 5,
        pickupStart: new Date(Date.now() - 60 * 60 * 1000),
        pickupEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
        status: ListingStatus.ACTIVE,
      },
    });
    listingId = listing.id;
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('registers a new customer and returns a session', async () => {
    const res = await request(server())
      .post('/auth/register/customer')
      .set('x-client-type', 'mobile')
      .send({ email: CUSTOMER_EMAIL, password: PASSWORD, name: 'E2E Customer' });
    expect(res.status).toBeLessThan(300);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('CUSTOMER');
    customerToken = res.body.accessToken;
  });

  it('authenticates the merchant', async () => {
    const res = await request(server())
      .post('/auth/login')
      .set('x-client-type', 'mobile')
      .send({ email: MERCHANT_EMAIL, password: PASSWORD });
    expect(res.status).toBeLessThan(300);
    merchantToken = res.body.accessToken;
    expect(merchantToken).toBeTruthy();
  });

  it('browses nearby listings and finds the active bag', async () => {
    const res = await request(server())
      .get('/listings/nearby')
      .query({ lat: LAT, lng: LNG, radiusKm: 5, sort: 'distance' })
      .set('authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((l: { id: string }) => l.id);
    expect(ids).toContain(listingId);
  });

  it('reserves a bag (RESERVED with a pickup code)', async () => {
    const res = await request(server())
      .post('/orders')
      .set('authorization', `Bearer ${customerToken}`)
      .send({ listingId, quantity: 1 });
    expect(res.status).toBeLessThan(300);
    expect(res.body.status).toBe('RESERVED');
    expect(res.body.pickupCode).toBeTruthy();
    orderId = res.body.id;
    pickupCode = res.body.pickupCode;
  });

  it('pays for the reservation (→ PAID)', async () => {
    const res = await request(server())
      .post(`/orders/${orderId}/pay`)
      .set('authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
  });

  it('rejects collection with a wrong pickup code', async () => {
    const res = await request(server())
      .post(`/orders/${orderId}/collect`)
      .set('authorization', `Bearer ${merchantToken}`)
      .send({ pickupCode: 'WRONG' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('collects the order with the correct code (→ COLLECTED)', async () => {
    const res = await request(server())
      .post(`/orders/${orderId}/collect`)
      .set('authorization', `Bearer ${merchantToken}`)
      .send({ pickupCode });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COLLECTED');
  });

  it('lets the customer review the collected order', async () => {
    const res = await request(server())
      .post(`/orders/${orderId}/review`)
      .set('authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'Lovely rescue!' });
    expect(res.status).toBeLessThan(300);
    expect(res.body.rating).toBe(5);
  });

  it('enforces auth — unauthenticated reserve is rejected', async () => {
    const res = await request(server()).post('/orders').send({ listingId, quantity: 1 });
    expect(res.status).toBe(401);
  });
});
