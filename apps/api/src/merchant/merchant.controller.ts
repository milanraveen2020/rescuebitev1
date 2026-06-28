import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  MerchantAnalytics,
  MerchantDashboard,
  StaffInviteResult,
  StaffMember,
  Store,
} from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InviteStaffDto, MerchantAnalyticsQueryDto, UpdateStoreDto } from './merchant.dto';
import { MerchantService } from './merchant.service';

/**
 * Merchant dashboard surface. Owners and staff share the store, dashboard, and
 * (via the orders controller) fulfillment. Profile edits, analytics, and staff
 * management are owner-only — the service enforces this.
 */
@ApiTags('merchant')
@ApiBearerAuth()
@Roles('MERCHANT_OWNER', 'MERCHANT_STAFF')
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchant: MerchantService) {}

  @Get('store')
  getStore(@CurrentUser() user: AuthenticatedUser): Promise<Store> {
    return this.merchant.getStore(user.id);
  }

  @Patch('store')
  updateStore(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateStoreDto): Promise<Store> {
    return this.merchant.updateStore(user.id, dto);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthenticatedUser): Promise<MerchantDashboard> {
    return this.merchant.dashboard(user.id);
  }

  @Get('analytics')
  analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MerchantAnalyticsQueryDto,
  ): Promise<MerchantAnalytics> {
    return this.merchant.analytics(user.id, query.days);
  }

  @Get('staff')
  listStaff(@CurrentUser() user: AuthenticatedUser): Promise<StaffMember[]> {
    return this.merchant.listStaff(user.id);
  }

  @Post('staff')
  inviteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteStaffDto,
  ): Promise<StaffInviteResult> {
    return this.merchant.inviteStaff(user.id, dto);
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.merchant.removeStaff(user.id, id);
  }
}
