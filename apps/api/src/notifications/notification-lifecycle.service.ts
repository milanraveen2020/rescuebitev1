import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsDispatcher } from './notifications.dispatcher';

const REMINDER_WINDOW_MINUTES = 30;

/**
 * Scheduled "pickup starting soon" reminders. Runs every 5 minutes and reminds
 * the customer (and store) for paid orders whose pickup window opens within the
 * next 30 minutes. The dispatcher dedupes per order, so repeated sweeps are safe.
 */
@Injectable()
export class NotificationLifecycleService {
  private readonly logger = new Logger(NotificationLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationsDispatcher,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendPickupReminders(): Promise<void> {
    const now = new Date();
    const soon = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID, listing: { pickupStart: { gte: now, lte: soon } } },
      select: { id: true },
    });
    for (const order of orders) {
      await this.dispatcher.sendPickupReminder(order.id);
    }
    if (orders.length > 0) {
      this.logger.log(`Checked ${orders.length} order(s) for pickup reminders.`);
    }
  }
}
