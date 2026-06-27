import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/** Auto-releases stock held by reservations that expired before payment. */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpired(): Promise<void> {
    const released = await this.orders.releaseExpiredReservations();
    if (released > 0) {
      this.logger.log(`Auto-released ${released} expired reservation(s).`);
    }
  }
}
