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
  AdminOverview,
  AuditLogEntry,
  BulkResult,
  OrderDetail,
  PlatformSettings,
} from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { OffsetPage } from '../common/pagination/pagination';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import {
  AdminListingQueryDto,
  AdminOrderQueryDto,
  AdminOverviewQueryDto,
  AdminReviewQueryDto,
  AdminStoreQueryDto,
  AdminUserQueryDto,
  AuditLogQueryDto,
  BulkIdsDto,
  HideReviewDto,
  RejectStoreDto,
  SuspendUserDto,
  UpdateSettingsDto,
  UpdateUserRoleDto,
} from './admin.dto';

/** Platform administration. ADMIN-only; every mutation is written to the audit log. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditLogService,
  ) {}

  // Overview
  @Get('overview')
  overview(@Query() query: AdminOverviewQueryDto): Promise<AdminOverview> {
    return this.admin.overview(query);
  }

  // Users
  @Get('users')
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.admin.suspendUser(admin.id, id, dto);
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivateUser(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.reactivateUser(admin.id, id);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(admin.id, id, dto);
  }

  // Stores
  @Get('stores')
  listStores(@Query() query: AdminStoreQueryDto) {
    return this.admin.listStores(query);
  }

  @Get('stores/:id')
  getStore(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getStore(id);
  }

  @Post('stores/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveStore(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.approveStore(admin.id, id);
  }

  @Post('stores/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectStore(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectStoreDto,
  ) {
    return this.admin.rejectStore(admin.id, id, dto);
  }

  @Post('stores/bulk-approve')
  @HttpCode(HttpStatus.OK)
  bulkApproveStores(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ): Promise<BulkResult> {
    return this.admin.bulkApproveStores(admin.id, dto.ids);
  }

  // Listings
  @Get('listings')
  listListings(@Query() query: AdminListingQueryDto) {
    return this.admin.listListings(query);
  }

  @Post('listings/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublishListing(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.unpublishListing(admin.id, id);
  }

  @Post('listings/bulk-unpublish')
  @HttpCode(HttpStatus.OK)
  bulkUnpublishListings(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: BulkIdsDto,
  ): Promise<BulkResult> {
    return this.admin.bulkUnpublishListings(admin.id, dto.ids);
  }

  // Orders
  @Get('orders')
  listOrders(@Query() query: AdminOrderQueryDto) {
    return this.admin.listOrders(query);
  }

  @Get('orders/:id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getOrder(id);
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  refundOrder(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.admin.refundOrder(admin.id, id);
  }

  // Reviews
  @Get('reviews')
  listReviews(@Query() query: AdminReviewQueryDto) {
    return this.admin.listReviews(query);
  }

  @Post('reviews/:id/hide')
  @HttpCode(HttpStatus.OK)
  hideReview(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HideReviewDto,
  ) {
    return this.admin.hideReview(admin.id, id, dto);
  }

  @Post('reviews/:id/unhide')
  @HttpCode(HttpStatus.OK)
  unhideReview(@CurrentUser() admin: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.unhideReview(admin.id, id);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReview(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.admin.removeReview(admin.id, id);
  }

  // Audit log
  @Get('audit-logs')
  auditLogs(@Query() query: AuditLogQueryDto): Promise<OffsetPage<AuditLogEntry>> {
    return this.audit.list(query);
  }

  // Settings
  @Get('settings')
  getSettings(): Promise<PlatformSettings> {
    return this.admin.getSettings();
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<PlatformSettings> {
    return this.admin.updateSettings(admin.id, dto);
  }
}
