import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListingsService } from './listings.service';

/**
 * Scheduled inventory lifecycle. Complements the on-write status checks: catches
 * listings whose pickup window has passed (EXPIRED) or that ran out of stock
 * (SOLD_OUT) without an explicit write.
 */
@Injectable()
export class ListingLifecycleService {
  private readonly logger = new Logger(ListingLifecycleService.name);

  constructor(private readonly listings: ListingsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSweep(): Promise<void> {
    const { expired, soldOut } = await this.listings.runLifecycleSweep();
    if (expired > 0 || soldOut > 0) {
      this.logger.log(`Lifecycle sweep: ${expired} expired, ${soldOut} sold out.`);
    }
  }
}
