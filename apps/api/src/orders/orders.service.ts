import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ListingStatus,
  OrderStatus,
  Prisma,
  StoreStatus,
  type Listing,
  type Order,
  type Review,
  type Store,
  type User,
} from '@prisma/client';
import type {
  CreateOrderInput,
  CreateReviewInput,
  MerchantOrder,
  Order as OrderDto,
  OrderDetail,
  OrderHistory,
  Review as ReviewDto,
  StoreOrders,
} from '@rescuebite/types';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  OrderEvents,
  ReviewEvents,
  type OrderEventPayload,
  type ReviewEventPayload,
} from '../events/order-events';
import { generatePickupCode } from './pickup-code';

type OrderWithRelations = Order & {
  listing: Listing;
  store: Store;
  review: Review | null;
};
type OrderForMerchant = Order & { listing: Listing; customer: User };

const ACTIVE_STATUSES: OrderStatus[] = [OrderStatus.RESERVED, OrderStatus.PAID];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly events: EventEmitter2,
  ) {}

  // --- Reserve -------------------------------------------------------------

  /**
   * Reserve stock for a listing. The decrement is a single conditional UPDATE
   * inside a transaction, so concurrent reservations can't oversell: the row is
   * locked and the `quantityRemaining >= quantity` guard re-checks the live value.
   */
  async reserve(customerId: string, input: CreateOrderInput): Promise<OrderDetail> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: input.listingId },
      include: { store: true },
    });
    if (!listing || listing.store.status !== StoreStatus.APPROVED) {
      throw new NotFoundException('That surprise bag could not be found.');
    }
    if (listing.status !== ListingStatus.ACTIVE || listing.pickupEnd.getTime() <= Date.now()) {
      throw new ConflictException('This surprise bag is no longer available.');
    }

    const holdMs = this.config.reservationHoldMinutes * 60_000;

    const order = await this.prisma.$transaction(async (tx) => {
      const decremented = await tx.listing.updateMany({
        where: {
          id: listing.id,
          status: ListingStatus.ACTIVE,
          pickupEnd: { gt: new Date() },
          quantityRemaining: { gte: input.quantity },
        },
        data: { quantityRemaining: { decrement: input.quantity } },
      });
      if (decremented.count === 0) {
        throw new ConflictException('Sorry, there isn’t enough stock left.');
      }

      const fresh = await tx.listing.findUniqueOrThrow({ where: { id: listing.id } });
      if (fresh.quantityRemaining === 0) {
        await tx.listing.update({
          where: { id: listing.id },
          data: { status: ListingStatus.SOLD_OUT },
        });
      }

      return tx.order.create({
        data: {
          customerId,
          listingId: listing.id,
          storeId: listing.storeId,
          quantity: input.quantity,
          unitPrice: listing.price,
          totalAmount: listing.price * input.quantity,
          currency: listing.store.currency,
          status: OrderStatus.RESERVED,
          pickupCode: await this.uniquePickupCode(tx),
          reservationExpiresAt: new Date(Date.now() + holdMs),
        },
        include: { listing: true, store: true, review: true },
      });
    });

    this.emitOrder(OrderEvents.Reserved, order);
    return toOrderDetail(order);
  }

  // --- Customer transitions ------------------------------------------------

  /** Stand-in for the payment flow (Prompt 11): RESERVED → PAID, hold released. */
  async pay(customerId: string, orderId: string): Promise<OrderDetail> {
    const order = await this.requireCustomerOrder(customerId, orderId);
    if (order.status !== OrderStatus.RESERVED) {
      throw new ConflictException('This order can no longer be paid.');
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, reservationExpiresAt: null },
      include: { listing: true, store: true, review: true },
    });
    this.emitOrder(OrderEvents.Paid, updated);
    return toOrderDetail(updated);
  }

  async cancel(customerId: string, orderId: string): Promise<OrderDetail> {
    const order = await this.requireCustomerOrder(customerId, orderId);
    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new ConflictException('This order can no longer be cancelled.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.releaseStock(tx, order);
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, reservationExpiresAt: null },
        include: { listing: true, store: true, review: true },
      });
    });
    this.emitOrder(OrderEvents.Cancelled, updated, 'customer');
    return toOrderDetail(updated);
  }

  // --- Merchant transitions ------------------------------------------------

  async collect(merchantUserId: string, orderId: string, pickupCode: string): Promise<OrderDetail> {
    const order = await this.requireMerchantOrder(merchantUserId, orderId);
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException('Only paid orders can be collected.');
    }
    if (order.pickupCode !== pickupCode.trim().toUpperCase()) {
      throw new BadRequestException('That pickup code does not match.');
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COLLECTED, collectedAt: new Date() },
      include: { listing: true, store: true, review: true },
    });
    this.emitOrder(OrderEvents.Collected, updated);
    return toOrderDetail(updated);
  }

  async markNoShow(merchantUserId: string, orderId: string): Promise<OrderDetail> {
    const order = await this.requireMerchantOrder(merchantUserId, orderId);
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException('Only paid orders can be marked as a no-show.');
    }
    if (order.listing.pickupEnd.getTime() > Date.now()) {
      throw new ConflictException('The pickup window has not closed yet.');
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.NO_SHOW },
      include: { listing: true, store: true, review: true },
    });
    this.emitOrder(OrderEvents.NoShow, updated);
    return toOrderDetail(updated);
  }

  /**
   * Refund an order: restores stock and sets REFUNDED. Idempotent — a no-op if
   * the order is already refunded (so the endpoint and the charge.refunded
   * webhook can both call it safely).
   */
  async markRefunded(orderId: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true, store: true, review: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.status === OrderStatus.REFUNDED) return toOrderDetail(order);
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.COLLECTED) {
      throw new ConflictException('This order cannot be refunded.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.releaseStock(tx, order);
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
        include: { listing: true, store: true, review: true },
      });
    });
    this.emitOrder(OrderEvents.Refunded, updated);
    return toOrderDetail(updated);
  }

  /** Mark an order PAID from a succeeded PaymentIntent. Idempotent. */
  async markPaidByPaymentIntent(paymentIntentId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!order || order.status !== OrderStatus.RESERVED) return;
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID, reservationExpiresAt: null },
      include: { listing: true, store: true, review: true },
    });
    this.emitOrder(OrderEvents.Paid, updated);
  }

  /** Refund the order behind a PaymentIntent (from charge.refunded). Idempotent. */
  async markRefundedByPaymentIntent(paymentIntentId: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (order) await this.markRefunded(order.id);
  }

  /** Persist the PaymentIntent id created for an order during checkout. */
  async attachPaymentIntent(orderId: string, paymentIntentId: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paymentIntentId },
    });
  }

  // --- Queries -------------------------------------------------------------

  async history(customerId: string): Promise<OrderHistory> {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: { listing: true, store: true, review: true },
      orderBy: { createdAt: 'desc' },
    });
    const active: OrderDetail[] = [];
    const past: OrderDetail[] = [];
    for (const order of orders) {
      (ACTIVE_STATUSES.includes(order.status) ? active : past).push(toOrderDetail(order));
    }
    return { active, past };
  }

  async getOne(customerId: string, orderId: string): Promise<OrderDetail> {
    return toOrderDetail(await this.requireCustomerOrder(customerId, orderId));
  }

  /** Merchant view of a store's orders, split into today's and upcoming pickups. */
  async storeOrders(merchantUserId: string, storeId: string): Promise<StoreOrders> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.ownerId !== merchantUserId) {
      throw new NotFoundException('Store not found.');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: { storeId, listing: { pickupEnd: { gte: startOfToday } } },
      include: { listing: true, customer: true },
      orderBy: { listing: { pickupStart: 'asc' } },
    });

    const today: MerchantOrder[] = [];
    const upcoming: MerchantOrder[] = [];
    for (const order of orders) {
      (order.listing.pickupStart < endOfToday ? today : upcoming).push(toMerchantOrder(order));
    }
    return { today, upcoming };
  }

  // --- Reviews -------------------------------------------------------------

  async review(customerId: string, orderId: string, input: CreateReviewInput): Promise<ReviewDto> {
    const order = await this.requireCustomerOrder(customerId, orderId);
    if (order.status !== OrderStatus.COLLECTED) {
      throw new ConflictException('You can only review orders you have collected.');
    }
    if (order.review) {
      throw new ConflictException('You have already reviewed this order.');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          orderId,
          customerId,
          storeId: order.storeId,
          rating: input.rating,
          comment: input.comment ?? null,
        },
      });
      // Keep the store's denormalized rating + count in sync.
      const agg = await tx.review.aggregate({
        where: { storeId: order.storeId },
        _avg: { rating: true },
        _count: true,
      });
      await tx.store.update({
        where: { id: order.storeId },
        data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
      });
      return created;
    });

    const payload: ReviewEventPayload = {
      reviewId: review.id,
      orderId,
      storeId: order.storeId,
      customerId,
      rating: review.rating,
    };
    this.events.emit(ReviewEvents.Created, payload);
    return toReview(review);
  }

  // --- Lifecycle (called by the scheduled sweep) ---------------------------

  /** Release stock for reservations that expired before payment. */
  async releaseExpiredReservations(): Promise<number> {
    const expired = await this.prisma.order.findMany({
      where: { status: OrderStatus.RESERVED, reservationExpiresAt: { lt: new Date() } },
      include: { listing: true, store: true, review: true },
    });

    for (const order of expired) {
      await this.prisma.$transaction(async (tx) => {
        // Re-check status inside the tx to avoid racing a concurrent pay/cancel.
        const current = await tx.order.findUnique({ where: { id: order.id } });
        if (!current || current.status !== OrderStatus.RESERVED) return;
        await this.releaseStock(tx, order);
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, reservationExpiresAt: null },
        });
      });
      this.emitOrder(OrderEvents.Cancelled, order, 'expired');
    }
    return expired.length;
  }

  // --- helpers -------------------------------------------------------------

  private async releaseStock(tx: Prisma.TransactionClient, order: Order): Promise<void> {
    const listing = await tx.listing.update({
      where: { id: order.listingId },
      data: { quantityRemaining: { increment: order.quantity } },
    });
    // Re-open a sold-out listing if its window is still open.
    if (listing.status === ListingStatus.SOLD_OUT && listing.pickupEnd.getTime() > Date.now()) {
      await tx.listing.update({ where: { id: listing.id }, data: { status: ListingStatus.ACTIVE } });
    }
  }

  private async uniquePickupCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generatePickupCode();
      const existing = await tx.order.findUnique({ where: { pickupCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('Could not allocate a pickup code, please retry.');
  }

  private async requireCustomerOrder(
    customerId: string,
    orderId: string,
  ): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true, store: true, review: true },
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  private async requireMerchantOrder(
    merchantUserId: string,
    orderId: string,
  ): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true, store: true, review: true },
    });
    if (!order || order.store.ownerId !== merchantUserId) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  private emitOrder(event: string, order: Order, reason?: string): void {
    const payload: OrderEventPayload = {
      orderId: order.id,
      customerId: order.customerId,
      storeId: order.storeId,
      listingId: order.listingId,
      status: order.status,
      ...(reason ? { reason } : {}),
    };
    this.events.emit(event, payload);
  }
}

// --- mappers ---------------------------------------------------------------

function toOrderBase(order: Order): OrderDto {
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
    reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    collectedAt: order.collectedAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
  };
}

function toOrderDetail(order: OrderWithRelations): OrderDetail {
  return {
    ...toOrderBase(order),
    listing: toListingSummary(order.listing),
    store: {
      id: order.store.id,
      name: order.store.name,
      category: order.store.category,
      address: order.store.address,
      lat: order.store.lat,
      lng: order.store.lng,
      logoUrl: order.store.logoUrl,
      rating: order.store.rating,
      reviewCount: order.store.reviewCount,
    },
    review: order.review ? toReview(order.review) : null,
  };
}

function toMerchantOrder(order: OrderForMerchant): MerchantOrder {
  return {
    ...toOrderBase(order),
    listing: toListingSummary(order.listing),
    customer: { id: order.customer.id, name: order.customer.name },
  };
}

function toListingSummary(listing: Listing) {
  return {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.imageUrl,
    category: listing.category,
    pickupStart: listing.pickupStart.toISOString(),
    pickupEnd: listing.pickupEnd.toISOString(),
  };
}

function toReview(review: Review): ReviewDto {
  return {
    id: review.id,
    orderId: review.orderId,
    customerId: review.customerId,
    storeId: review.storeId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}
