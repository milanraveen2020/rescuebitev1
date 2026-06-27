import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CheckoutSession, ConnectStatus, OnboardingLink, OrderDetail } from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Stripe publishable key for initializing Stripe.js on the client. */
  @Public()
  @Get('config')
  config(): { publishableKey: string } {
    return { publishableKey: this.payments.getPublishableKey() };
  }

  @ApiBearerAuth()
  @Roles('MERCHANT_OWNER')
  @Post('connect/onboarding')
  @HttpCode(HttpStatus.OK)
  onboarding(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingLink> {
    return this.payments.createOnboardingLink(user.id);
  }

  @ApiBearerAuth()
  @Roles('MERCHANT_OWNER')
  @Get('connect/status')
  connectStatus(@CurrentUser() user: AuthenticatedUser): Promise<ConnectStatus> {
    return this.payments.getConnectStatus(user.id);
  }

  @ApiBearerAuth()
  @Roles('CUSTOMER')
  @Post('orders/:id/checkout')
  @HttpCode(HttpStatus.OK)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ): Promise<CheckoutSession> {
    return this.payments.createCheckout(user.id, orderId);
  }

  @ApiBearerAuth()
  @Roles('MERCHANT_OWNER')
  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ): Promise<OrderDetail> {
    return this.payments.refund(user.id, orderId);
  }
}
