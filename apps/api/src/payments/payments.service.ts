import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { OrderStatus } from '@prisma/client';
import type { CheckoutSession, ConnectStatus, OnboardingLink, OrderDetail } from '@rescuebite/types';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { computePlatformFee } from './fees';
import { STRIPE_CLIENT, type StripeClient } from './stripe.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly orders: OrdersService,
  ) {}

  // --- Stripe Connect (merchant) ------------------------------------------

  async createOnboardingLink(merchantUserId: string): Promise<OnboardingLink> {
    const stripe = this.requireStripe();
    const store = await this.requireOwnedStore(merchantUserId);

    let accountId = store.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { storeId: store.id },
      });
      accountId = account.id;
      await this.prisma.store.update({
        where: { id: store.id },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${this.config.appWebUrl}/payouts?refresh=1`,
      return_url: `${this.config.appWebUrl}/payouts?onboarded=1`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  }

  async getConnectStatus(merchantUserId: string): Promise<ConnectStatus> {
    const store = await this.requireOwnedStore(merchantUserId);
    if (!store.stripeAccountId) {
      return { stripeAccountId: null, connected: false, payoutsEnabled: false, detailsSubmitted: false };
    }
    // Reconcile against Stripe when available so the dashboard is accurate.
    if (this.stripe) {
      const account = await this.stripe.accounts.retrieve(store.stripeAccountId);
      const payoutsEnabled = account.payouts_enabled === true;
      if (payoutsEnabled !== store.payoutsEnabled) {
        await this.prisma.store.update({ where: { id: store.id }, data: { payoutsEnabled } });
      }
      return {
        stripeAccountId: store.stripeAccountId,
        connected: true,
        payoutsEnabled,
        detailsSubmitted: account.details_submitted === true,
      };
    }
    return {
      stripeAccountId: store.stripeAccountId,
      connected: true,
      payoutsEnabled: store.payoutsEnabled,
      detailsSubmitted: store.payoutsEnabled,
    };
  }

  // --- Customer checkout ---------------------------------------------------

  async createCheckout(customerId: string, orderId: string): Promise<CheckoutSession> {
    const stripe = this.requireStripe();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order || order.customerId !== customerId) throw new NotFoundException('Order not found.');
    if (order.status !== OrderStatus.RESERVED) {
      throw new ConflictException('This order is not awaiting payment.');
    }
    if (!order.store.stripeAccountId || !order.store.payoutsEnabled) {
      throw new ConflictException('This store cannot accept payments yet.');
    }

    // Never trust client amounts — recompute from the price locked at reservation.
    const amount = order.unitPrice * order.quantity;
    const fee = computePlatformFee(amount, this.config.platformFeeBps);
    const currency = order.currency.toLowerCase();

    // Reuse an existing intent if one is still payable.
    if (order.stripePaymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (existing.status !== 'canceled' && existing.status !== 'succeeded') {
        return this.toSession(existing, amount, fee, order.currency);
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: fee,
      transfer_data: { destination: order.store.stripeAccountId },
      metadata: { orderId: order.id, customerId },
      automatic_payment_methods: { enabled: true },
    });
    await this.orders.attachPaymentIntent(order.id, intent.id);
    return this.toSession(intent, amount, fee, order.currency);
  }

  // --- Refund (merchant) ---------------------------------------------------

  async refund(merchantUserId: string, orderId: string): Promise<OrderDetail> {
    const stripe = this.requireStripe();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order || order.store.ownerId !== merchantUserId) {
      throw new NotFoundException('Order not found.');
    }
    if (!order.stripePaymentIntentId) {
      throw new ConflictException('This order has no payment to refund.');
    }
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.COLLECTED) {
      throw new ConflictException('This order cannot be refunded.');
    }

    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    // Reflect immediately; the charge.refunded webhook is idempotent.
    return this.orders.markRefunded(order.id);
  }

  getPublishableKey(): string {
    return this.config.stripePublishableKey;
  }

  // --- Webhooks ------------------------------------------------------------

  /** Verify the Stripe signature and parse the event. Throws on bad signatures. */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = this.requireStripe();
    const secret = this.config.stripeWebhookSecret;
    if (!secret) throw new ServiceUnavailableException('Webhook secret not configured.');
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /** Apply a verified Stripe event. Each branch is idempotent. */
  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        await this.orders.markPaidByPaymentIntent(intent.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        // Leave the order RESERVED; the hold sweep will release it. Just log.
        const intent = event.data.object;
        this.logger.warn(`PaymentIntent failed: ${intent.id}`);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (intentId) await this.orders.markRefundedByPaymentIntent(intentId);
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        const payoutsEnabled = account.payouts_enabled === true && account.charges_enabled === true;
        await this.prisma.store.updateMany({
          where: { stripeAccountId: account.id },
          data: { payoutsEnabled },
        });
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  // --- helpers -------------------------------------------------------------

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Payments are not configured.');
    }
    return this.stripe;
  }

  private async requireOwnedStore(merchantUserId: string) {
    const store = await this.prisma.store.findFirst({ where: { ownerId: merchantUserId } });
    if (!store) throw new NotFoundException('You do not have a store yet.');
    return store;
  }

  private toSession(
    intent: Stripe.PaymentIntent,
    amount: number,
    fee: number,
    currency: string,
  ): CheckoutSession {
    if (!intent.client_secret) {
      throw new ServiceUnavailableException('Could not initialize payment.');
    }
    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount,
      applicationFee: fee,
      currency,
      publishableKey: this.config.stripePublishableKey,
    };
  }
}
