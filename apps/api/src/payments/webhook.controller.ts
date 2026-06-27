import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class WebhookController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Stripe webhook. Verifies the signature against the raw body (enabled via
   * `rawBody: true` in main.ts), then applies the event. Returns 200 quickly so
   * Stripe doesn't retry; handlers are idempotent.
   */
  @Public()
  @ApiExcludeEndpoint()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing webhook signature or body.');
    }
    let event;
    try {
      event = this.payments.constructEvent(req.rawBody, signature);
    } catch {
      // Bad signature — tell Stripe it was rejected (do not 5xx).
      throw new BadRequestException('Invalid webhook signature.');
    }
    await this.payments.handleEvent(event);
    return { received: true };
  }
}
