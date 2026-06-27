/**
 * RescueBite seed.
 *
 * Creates a realistic-but-small dataset so every screen across the customer,
 * merchant, and admin apps has something to render:
 *   - 1 admin
 *   - 3 merchants (owners) each with an approved store
 *   - ~21 listings spread across past / live / upcoming pickup windows and every status
 *   - 5 customers
 *   - orders in every OrderStatus, with reviews on collected orders
 *   - favorites, notifications, and audit logs
 *
 * Idempotent: wipes the domain tables, then recreates everything from fixed inputs.
 * Run with `pnpm --filter @rescuebite/api db:seed`.
 */
import {
  FoodCategory,
  ListingStatus,
  NotificationType,
  OrderStatus,
  PrismaClient,
  StoreStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';
const passwordHash = hashSync(SEED_PASSWORD, 10);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
/** Relative time helper: hours from now (negative = past). */
const at = (hoursFromNow: number): Date => new Date(now + hoursFromNow * HOUR);

const PICKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
function pickupCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += PICKUP_CODE_ALPHABET[Math.floor(Math.random() * PICKUP_CODE_ALPHABET.length)];
  }
  return code;
}

async function wipe(): Promise<void> {
  // Delete in FK-dependency order.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  await wipe();

  // --- Admin ---------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      email: 'admin@rescuebite.test',
      phone: '+10000000000',
      passwordHash,
      role: UserRole.ADMIN,
      name: 'Ada Admin',
      status: UserStatus.ACTIVE,
    },
  });

  // --- Merchants + stores --------------------------------------------------
  const storeSeeds = [
    {
      ownerEmail: 'owner1@rescuebite.test',
      ownerName: 'Bruno Baker',
      store: {
        name: 'Crumbs & Co. Bakery',
        description: 'Artisan sourdough, pastries, and end-of-day bread bags.',
        category: FoodCategory.BAKERY,
        address: '12 Mill Lane, Dublin',
        lat: 53.3498,
        lng: -6.2603,
      },
    },
    {
      ownerEmail: 'owner2@rescuebite.test',
      ownerName: 'Giulia Verde',
      store: {
        name: 'Verde Grocer',
        description: 'Neighbourhood grocery rescuing fresh produce daily.',
        category: FoodCategory.GROCERY,
        address: '8 Market Street, Dublin',
        lat: 53.3441,
        lng: -6.2675,
      },
    },
    {
      ownerEmail: 'owner3@rescuebite.test',
      ownerName: 'Theo Kafe',
      store: {
        name: 'Morning Owl Café',
        description: 'Specialty coffee and lunch surplus boxes.',
        category: FoodCategory.CAFE,
        address: '45 Dawson Street, Dublin',
        lat: 53.3402,
        lng: -6.2589,
      },
    },
  ] as const;

  const stores = [];
  for (const seed of storeSeeds) {
    const owner = await prisma.user.create({
      data: {
        email: seed.ownerEmail,
        passwordHash,
        role: UserRole.MERCHANT_OWNER,
        name: seed.ownerName,
        status: UserStatus.ACTIVE,
      },
    });
    const store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        ...seed.store,
        currency: 'EUR',
        stripeAccountId: `acct_seed_${owner.id.slice(0, 8)}`,
        payoutsEnabled: true,
        status: StoreStatus.APPROVED,
      },
    });
    stores.push(store);
  }

  // A 4th store left PENDING so the admin approval queue isn't empty.
  const pendingOwner = await prisma.user.create({
    data: {
      email: 'owner4@rescuebite.test',
      passwordHash,
      role: UserRole.MERCHANT_OWNER,
      name: 'Pat Pending',
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.store.create({
    data: {
      ownerId: pendingOwner.id,
      name: 'Fresh Start Deli',
      description: 'Awaiting approval to start rescuing food.',
      category: FoodCategory.RESTAURANT,
      address: '2 Quay Road, Dublin',
      lat: 53.3478,
      lng: -6.2497,
      status: StoreStatus.PENDING,
    },
  });

  // --- Listings (~21) across pickup windows and statuses -------------------
  // Each store gets 7 listings: 2 expired (past), 4 active (live/upcoming), 1 sold-out, plus 1 draft.
  const listingTemplates = [
    { title: 'Surprise Bakery Bag', category: FoodCategory.BAKERY, original: 1500, price: 499 },
    { title: 'Pastry Box', category: FoodCategory.BAKERY, original: 1200, price: 399 },
    { title: 'Fresh Produce Box', category: FoodCategory.PRODUCE, original: 1800, price: 599 },
    { title: 'Pantry Rescue Bag', category: FoodCategory.GROCERY, original: 2000, price: 699 },
    { title: 'Lunch Surplus Box', category: FoodCategory.RESTAURANT, original: 1400, price: 499 },
    { title: 'Coffee & Treats Bag', category: FoodCategory.CAFE, original: 1000, price: 349 },
    { title: 'Chef’s Mystery Bag', category: FoodCategory.OTHER, original: 2500, price: 799 },
  ] as const;

  const allergenOptions = [
    'Contains gluten, may contain nuts',
    'Contains dairy',
    'Vegan-friendly options included',
    null,
  ];

  type CreatedListing = { id: string; storeId: string; price: number; status: ListingStatus };
  const activeListings: CreatedListing[] = [];

  for (const store of stores) {
    for (let i = 0; i < listingTemplates.length; i += 1) {
      const tpl = listingTemplates[i]!;
      // Window plan by index: 0,1 expired; 2..5 live/upcoming; 6 draft (future).
      let pickupStart: Date;
      let pickupEnd: Date;
      let status: ListingStatus;
      let quantityTotal = 6;
      let quantityRemaining = 4;

      if (i <= 1) {
        // Expired: window ended in the past.
        pickupStart = at(-DAY / HOUR - 4 + i);
        pickupEnd = at(-DAY / HOUR - 1 + i);
        status = ListingStatus.EXPIRED;
        quantityRemaining = 0;
      } else if (i === 5) {
        // Sold out: live window but nothing left.
        pickupStart = at(2);
        pickupEnd = at(5);
        status = ListingStatus.SOLD_OUT;
        quantityRemaining = 0;
      } else if (i === 6) {
        // Draft: not yet published, upcoming window.
        pickupStart = at(2 * DAY / HOUR);
        pickupEnd = at(2 * DAY / HOUR + 3);
        status = ListingStatus.DRAFT;
        quantityRemaining = quantityTotal;
      } else {
        // Active: spread across today and the next two days.
        const offsetDays = i - 2; // 0,1,2
        pickupStart = at(offsetDays * DAY / HOUR + 5);
        pickupEnd = at(offsetDays * DAY / HOUR + 8);
        status = ListingStatus.ACTIVE;
        quantityRemaining = 3 + (i % 3);
      }

      const listing = await prisma.listing.create({
        data: {
          storeId: store.id,
          title: tpl.title,
          description: `${tpl.title} from ${store.name}. Save it from going to waste!`,
          category: tpl.category,
          originalPrice: tpl.original,
          price: tpl.price,
          quantityTotal,
          quantityRemaining,
          pickupStart,
          pickupEnd,
          imageUrl: `https://picsum.photos/seed/${store.id.slice(0, 6)}-${i}/600/400`,
          allergenInfo: allergenOptions[i % allergenOptions.length] ?? null,
          status,
        },
      });
      if (status === ListingStatus.ACTIVE) {
        activeListings.push({
          id: listing.id,
          storeId: store.id,
          price: listing.price,
          status,
        });
      }
    }
  }

  // --- Customers -----------------------------------------------------------
  const customerSeeds = [
    { email: 'cara@rescuebite.test', name: 'Cara Customer' },
    { email: 'dev@rescuebite.test', name: 'Devon Diner' },
    { email: 'mia@rescuebite.test', name: 'Mia Muncher' },
    { email: 'sam@rescuebite.test', name: 'Sam Saver' },
    { email: 'noa@rescuebite.test', name: 'Noa Nibbler' },
  ];
  const customers = [];
  for (const c of customerSeeds) {
    customers.push(
      await prisma.user.create({
        data: {
          email: c.email,
          passwordHash,
          role: UserRole.CUSTOMER,
          name: c.name,
          status: UserStatus.ACTIVE,
        },
      }),
    );
  }
  // One suspended customer so the admin "suspended users" view has data.
  await prisma.user.create({
    data: {
      email: 'banned@rescuebite.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      name: 'Blocked Bob',
      status: UserStatus.SUSPENDED,
    },
  });

  // --- Orders in every status ---------------------------------------------
  // Cover RESERVED, PAID, COLLECTED, CANCELLED, REFUNDED, NO_SHOW.
  const orderPlan: OrderStatus[] = [
    OrderStatus.RESERVED,
    OrderStatus.PAID,
    OrderStatus.COLLECTED,
    OrderStatus.COLLECTED,
    OrderStatus.COLLECTED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
    OrderStatus.NO_SHOW,
    OrderStatus.PAID,
    OrderStatus.COLLECTED,
    OrderStatus.RESERVED,
  ];

  const collectedOrders: { id: string; customerId: string; storeId: string }[] = [];

  for (let i = 0; i < orderPlan.length; i += 1) {
    const status = orderPlan[i]!;
    const listing = activeListings[i % activeListings.length]!;
    const customer = customers[i % customers.length]!;
    const quantity = 1 + (i % 2);
    const unitPrice = listing.price;
    const isPaidish =
      status === OrderStatus.PAID ||
      status === OrderStatus.COLLECTED ||
      status === OrderStatus.NO_SHOW ||
      status === OrderStatus.REFUNDED;

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        listingId: listing.id,
        storeId: listing.storeId,
        quantity,
        unitPrice,
        totalAmount: unitPrice * quantity,
        currency: 'EUR',
        status,
        pickupCode: pickupCode(),
        stripePaymentIntentId: isPaidish ? `pi_seed_${i}_${Math.floor(Math.random() * 1e6)}` : null,
        createdAt: at(-((i + 1) * 6)),
        collectedAt: status === OrderStatus.COLLECTED ? at(-((i + 1) * 6) + 2) : null,
      },
    });

    if (status === OrderStatus.COLLECTED) {
      collectedOrders.push({ id: order.id, customerId: customer.id, storeId: listing.storeId });
    }
  }

  // --- Reviews on collected orders + denormalized store ratings -----------
  const reviewComments = [
    'Amazing value, bag was packed!',
    'Great food, friendly staff.',
    'Good but pickup was a little rushed.',
    null,
  ];
  for (let i = 0; i < collectedOrders.length; i += 1) {
    const co = collectedOrders[i]!;
    const rating = 4 + (i % 2); // 4 or 5
    await prisma.review.create({
      data: {
        orderId: co.id,
        customerId: co.customerId,
        storeId: co.storeId,
        rating,
        comment: reviewComments[i % reviewComments.length] ?? null,
      },
    });
  }
  // Recompute denormalized rating + reviewCount per store.
  for (const store of stores) {
    const agg = await prisma.review.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.store.update({
      where: { id: store.id },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }

  // --- Favorites -----------------------------------------------------------
  for (let i = 0; i < customers.length; i += 1) {
    await prisma.favorite.create({
      data: {
        userId: customers[i]!.id,
        storeId: stores[i % stores.length]!.id,
      },
    });
  }

  // --- Notifications -------------------------------------------------------
  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i]!;
    await prisma.notification.createMany({
      data: [
        {
          userId: customer.id,
          type: NotificationType.ORDER_RESERVED,
          title: 'Your bag is reserved',
          body: 'Show your pickup code at the store during the pickup window.',
          data: { kind: 'order' },
          readAt: i % 2 === 0 ? at(-3) : null,
        },
        {
          userId: customer.id,
          type: NotificationType.PICKUP_REMINDER,
          title: 'Pickup starts soon',
          body: 'Your pickup window opens in 1 hour.',
          data: null,
          readAt: null,
        },
      ],
    });
  }

  // --- Audit logs (admin) --------------------------------------------------
  await prisma.auditLog.createMany({
    data: stores.map((store) => ({
      actorId: admin.id,
      action: 'STORE_APPROVED',
      entity: 'Store',
      entityId: store.id,
      metadata: { reason: 'Verified documents' },
    })),
  });

  // Console summary (allowed by lint rules for tooling).
  const counts = {
    users: await prisma.user.count(),
    stores: await prisma.store.count(),
    listings: await prisma.listing.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    favorites: await prisma.favorite.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  console.warn('Seed complete:', counts);
  console.warn(`All seeded accounts use password: ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
