import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus, type NotificationType } from '@prisma/client';
import type { NotificationData } from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService, type OrderEmailData } from '../common/email/email.service';
import {
  ListingEvents,
  OrderEvents,
  StoreEvents,
  type ListingEventPayload,
  type OrderEventPayload,
  type StoreEventPayload,
} from '../events/order-events';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

type Category = 'orderUpdates' | 'pickupReminders' | 'newBagsNearby' | 'account';

interface DeliverOptions {
  userId: string;
  category: Category;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  dedupeKey: string;
  push?: boolean;
}

/**
 * Maps domain events (Prompts 6–7) to notifications across three channels:
 * in-app inbox, Expo push, and email. Handlers are fire-and-forget — emit()
 * doesn't await them, so the originating request is never blocked — and every
 * handler swallows its own errors. Delivery is idempotent via a per-event
 * `dedupeKey`: the inbox row is the idempotency anchor, and push/email only fire
 * when a new row was actually created.
 */
@Injectable()
export class NotificationsDispatcher {
  private readonly logger = new Logger(NotificationsDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
    private readonly email: EmailService,
  ) {}

  // --- Event subscriptions -------------------------------------------------

  @OnEvent(OrderEvents.Paid)
  onOrderPaid(payload: OrderEventPayload): void {
    void this.safe('order.paid', () => this.handleOrderPaid(payload));
  }

  @OnEvent(OrderEvents.Collected)
  onOrderCollected(payload: OrderEventPayload): void {
    void this.safe('order.collected', () => this.handleOrderCollected(payload));
  }

  @OnEvent(OrderEvents.Refunded)
  onOrderRefunded(payload: OrderEventPayload): void {
    void this.safe('order.refunded', () => this.handleOrderRefunded(payload));
  }

  @OnEvent(StoreEvents.Approved)
  onStoreApproved(payload: StoreEventPayload): void {
    void this.safe('store.approved', () => this.handleStoreDecision(payload, true));
  }

  @OnEvent(StoreEvents.Rejected)
  onStoreRejected(payload: StoreEventPayload): void {
    void this.safe('store.rejected', () => this.handleStoreDecision(payload, false));
  }

  @OnEvent(ListingEvents.Published)
  onListingPublished(payload: ListingEventPayload): void {
    void this.safe('listing.published', () => this.handleListingPublished(payload));
  }

  // --- Handlers (public so the event→notification mapping is unit-testable) -

  async handleOrderPaid(payload: OrderEventPayload): Promise<void> {
    const order = await this.loadOrder(payload.orderId);
    if (!order) return;

    // Customer: confirmation in the inbox + push, and the branded email receipt.
    const created = await this.deliver({
      userId: order.customerId,
      category: 'orderUpdates',
      type: 'ORDER_PAID',
      title: 'Order confirmed 🎉',
      body: `Your bag from ${order.store.name} is reserved. Code ${order.pickupCode}.`,
      data: { orderId: order.id, pickupCode: order.pickupCode },
      dedupeKey: `order:${order.id}:PAID`,
    });
    if (created && (await this.wantsEmail(order.customerId, 'orderUpdates'))) {
      await this.email.sendOrderConfirmation(this.toOrderEmail(order));
    }

    // Merchant (owner + staff): a new order to fulfil.
    for (const userId of await this.storeRecipients(order.storeId)) {
      await this.deliver({
        userId,
        category: 'orderUpdates',
        type: 'NEW_ORDER',
        title: 'New order',
        body: `${order.quantity}× ${order.listing.title} — code ${order.pickupCode}.`,
        data: { orderId: order.id, storeId: order.storeId },
        dedupeKey: `order:${order.id}:NEW_ORDER:${userId}`,
      });
    }
  }

  async handleOrderCollected(payload: OrderEventPayload): Promise<void> {
    const order = await this.loadOrder(payload.orderId);
    if (!order) return;
    await this.deliver({
      userId: order.customerId,
      category: 'orderUpdates',
      type: 'ORDER_COLLECTED',
      title: 'Enjoy your rescued food! 🌱',
      body: `You collected your bag from ${order.store.name}.`,
      data: { orderId: order.id },
      dedupeKey: `order:${order.id}:COLLECTED`,
    });
  }

  async handleOrderRefunded(payload: OrderEventPayload): Promise<void> {
    const order = await this.loadOrder(payload.orderId);
    if (!order) return;
    const created = await this.deliver({
      userId: order.customerId,
      category: 'orderUpdates',
      type: 'ORDER_REFUNDED',
      title: 'Refund issued',
      body: `Your order from ${order.store.name} was refunded.`,
      data: { orderId: order.id },
      dedupeKey: `order:${order.id}:REFUNDED`,
    });
    if (created && (await this.wantsEmail(order.customerId, 'orderUpdates'))) {
      await this.email.sendRefundNotice(this.toOrderEmail(order));
    }
  }

  async handleStoreDecision(payload: StoreEventPayload, approved: boolean): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: payload.storeId },
      include: { owner: { select: { name: true, email: true } } },
    });
    if (!store) return;
    const created = await this.deliver({
      userId: payload.ownerId,
      category: 'account',
      type: approved ? 'STORE_APPROVED' : 'STORE_REJECTED',
      title: approved ? 'Your store is approved 🎉' : 'Store application update',
      body: approved
        ? `${store.name} is live on RescueBite.`
        : `${store.name} wasn't approved.${payload.reason ? ` ${payload.reason}` : ''}`,
      data: { storeId: store.id },
      dedupeKey: `store:${store.id}:${approved ? 'APPROVED' : 'REJECTED'}`,
    });
    if (created && (await this.wantsEmail(payload.ownerId, 'account'))) {
      await this.email.sendStoreApprovalResult({
        email: store.owner.email,
        name: store.owner.name,
        storeName: store.name,
        approved,
        ...(payload.reason ? { reason: payload.reason } : {}),
      });
    }
  }

  async handleListingPublished(payload: ListingEventPayload): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: payload.listingId },
      include: { store: { select: { name: true } } },
    });
    if (!listing) return;
    const favorites = await this.prisma.favorite.findMany({
      where: { storeId: payload.storeId },
      select: { userId: true },
    });
    for (const { userId } of favorites) {
      await this.deliver({
        userId,
        category: 'newBagsNearby',
        type: 'NEW_LISTING',
        title: 'New bags near you 🛍️',
        body: `${listing.store.name} just listed “${listing.title}”.`,
        data: { listingId: listing.id, storeId: listing.storeId },
        dedupeKey: `listing:${listing.id}:NEW:${userId}`,
      });
    }
  }

  /** Called by the scheduled lifecycle sweep for a paid order with an imminent pickup. */
  async sendPickupReminder(orderId: string): Promise<void> {
    const order = await this.loadOrder(orderId);
    if (!order || order.status !== OrderStatus.PAID) return;
    await this.deliver({
      userId: order.customerId,
      category: 'pickupReminders',
      type: 'PICKUP_REMINDER',
      title: 'Pickup starting soon ⏰',
      body: `Your bag from ${order.store.name} is ready. Code ${order.pickupCode}.`,
      data: { orderId: order.id, pickupCode: order.pickupCode },
      dedupeKey: `order:${order.id}:reminder`,
    });
    for (const userId of await this.storeRecipients(order.storeId)) {
      await this.deliver({
        userId,
        category: 'pickupReminders',
        type: 'PICKUP_REMINDER',
        title: 'Pickup window approaching',
        body: `${order.quantity}× ${order.listing.title} — code ${order.pickupCode}.`,
        data: { orderId: order.id, storeId: order.storeId },
        dedupeKey: `order:${order.id}:reminder:${userId}`,
      });
    }
  }

  // --- Delivery primitives -------------------------------------------------

  /**
   * Create the inbox row (idempotent) and, if newly created and the user opts in,
   * send a push. Returns whether a new notification was created — callers use
   * this to make the email channel idempotent too.
   */
  private async deliver(opts: DeliverOptions): Promise<boolean> {
    const prefs = await this.notifications.getPreferences(opts.userId);
    if (opts.category !== 'account' && !prefs[opts.category]) return false;

    const created = await this.notifications.create({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      ...(opts.data ? { data: opts.data } : {}),
      dedupeKey: opts.dedupeKey,
    });
    if (!created) return false;

    if (opts.push !== false && prefs.push) {
      const data = { ...(opts.data ?? {}), type: opts.type };
      await this.push.sendToUser(opts.userId, { title: opts.title, body: opts.body, data });
    }
    return true;
  }

  private async wantsEmail(userId: string, category: Category): Promise<boolean> {
    const prefs = await this.notifications.getPreferences(userId);
    return prefs.email && (category === 'account' || prefs[category]);
  }

  /** Store owner + linked staff — everyone who should hear about store activity. */
  private async storeRecipients(storeId: string): Promise<string[]> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true },
    });
    if (!store) return [];
    const staff = await this.prisma.user.findMany({
      where: { staffStoreId: storeId },
      select: { id: true },
    });
    return [store.ownerId, ...staff.map((s) => s.id)];
  }

  private loadOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true } },
        store: { select: { name: true } },
        listing: { select: { title: true, pickupStart: true, pickupEnd: true } },
      },
    });
  }

  private toOrderEmail(
    order: NonNullable<Awaited<ReturnType<NotificationsDispatcher['loadOrder']>>>,
  ): OrderEmailData {
    return {
      email: order.customer.email,
      name: order.customer.name,
      storeName: order.store.name,
      listingTitle: order.listing.title,
      quantity: order.quantity,
      totalMinor: order.totalAmount,
      currency: order.currency,
      pickupCode: order.pickupCode,
      pickupWindow: formatWindow(order.listing.pickupStart, order.listing.pickupEnd),
    };
  }

  private async safe(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(
        `Notification handler failed for ${label}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

function formatWindow(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat('en-LK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(start);
  const time = new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time.format(start)} – ${time.format(end)}`;
}
