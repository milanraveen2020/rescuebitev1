import { ServiceUnavailableException } from '@nestjs/common';
import type Stripe from 'stripe';
import type { AppConfigService } from '../config/app-config.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { OrdersService } from '../orders/orders.service';
import type { SettingsService } from '../common/settings/settings.service';
import { PaymentsService } from './payments.service';
import type { StripeClient } from './stripe.provider';

function event(type: string, object: unknown): Stripe.Event {
  return { type, data: { object } } as unknown as Stripe.Event;
}

function setup(overrides: { stripe?: StripeClient; webhookSecret?: string } = {}) {
  const orders = {
    markPaidByPaymentIntent: jest.fn().mockResolvedValue(undefined),
    markRefundedByPaymentIntent: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    store: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const config = {
    stripeWebhookSecret: overrides.webhookSecret,
    platformFeeBps: 1000,
    stripePublishableKey: 'pk_test_x',
  } as AppConfigService;
  const settings = { getCommissionBps: jest.fn().mockResolvedValue(1000) };
  const service = new PaymentsService(
    overrides.stripe ?? null,
    prisma as unknown as PrismaService,
    config,
    orders as unknown as OrdersService,
    settings as unknown as SettingsService,
  );
  return { service, orders, prisma };
}

describe('PaymentsService webhook handling', () => {
  it('marks the order paid on payment_intent.succeeded', async () => {
    const { service, orders } = setup();
    await service.handleEvent(event('payment_intent.succeeded', { id: 'pi_123' }));
    expect(orders.markPaidByPaymentIntent).toHaveBeenCalledWith('pi_123');
  });

  it('does not touch orders on payment_intent.payment_failed', async () => {
    const { service, orders } = setup();
    await service.handleEvent(event('payment_intent.payment_failed', { id: 'pi_fail' }));
    expect(orders.markPaidByPaymentIntent).not.toHaveBeenCalled();
    expect(orders.markRefundedByPaymentIntent).not.toHaveBeenCalled();
  });

  it('refunds the order on charge.refunded (string payment_intent)', async () => {
    const { service, orders } = setup();
    await service.handleEvent(event('charge.refunded', { payment_intent: 'pi_ref' }));
    expect(orders.markRefundedByPaymentIntent).toHaveBeenCalledWith('pi_ref');
  });

  it('enables payouts on account.updated when charges + payouts are enabled', async () => {
    const { service, prisma } = setup();
    await service.handleEvent(
      event('account.updated', { id: 'acct_1', payouts_enabled: true, charges_enabled: true }),
    );
    expect(prisma.store.updateMany).toHaveBeenCalledWith({
      where: { stripeAccountId: 'acct_1' },
      data: { payoutsEnabled: true },
    });
  });

  it('disables payouts on account.updated when charges are not enabled', async () => {
    const { service, prisma } = setup();
    await service.handleEvent(
      event('account.updated', { id: 'acct_2', payouts_enabled: true, charges_enabled: false }),
    );
    expect(prisma.store.updateMany).toHaveBeenCalledWith({
      where: { stripeAccountId: 'acct_2' },
      data: { payoutsEnabled: false },
    });
  });

  it('ignores unhandled event types without error', async () => {
    const { service, orders } = setup();
    await expect(service.handleEvent(event('invoice.paid', {}))).resolves.toBeUndefined();
    expect(orders.markPaidByPaymentIntent).not.toHaveBeenCalled();
  });
});

describe('PaymentsService.constructEvent', () => {
  it('verifies the signature via the Stripe client', () => {
    const constructed = event('payment_intent.succeeded', { id: 'pi_1' });
    const stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue(constructed) },
    } as unknown as StripeClient;
    const { service } = setup({ stripe, webhookSecret: 'whsec_test' });

    const result = service.constructEvent(Buffer.from('{}'), 'sig_123');

    expect(result).toBe(constructed);
    const stripeMock = stripe as unknown as { webhooks: { constructEvent: jest.Mock } };
    expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('{}'),
      'sig_123',
      'whsec_test',
    );
  });

  it('throws when payments are not configured', () => {
    const { service } = setup({ stripe: null, webhookSecret: 'whsec_test' });
    expect(() => service.constructEvent(Buffer.from('{}'), 'sig')).toThrow(
      ServiceUnavailableException,
    );
  });
});
