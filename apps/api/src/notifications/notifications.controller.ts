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
  Notification,
  NotificationPage,
  NotificationPreferences,
  UnreadCount,
} from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import {
  NotificationsQueryDto,
  RegisterDeviceDto,
  UnregisterDeviceDto,
  UpdateNotificationPreferencesDto,
} from './notifications.dto';

/**
 * The in-app inbox and notification settings for the signed-in user. Available
 * to every authenticated role (no @Roles) — everyone has an inbox.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationsQueryDto,
  ): Promise<NotificationPage> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCount> {
    return { unread: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    return this.notifications.markRead(user.id, id);
  }

  // --- Devices (push) ------------------------------------------------------

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    return this.notifications.registerDevice(user.id, dto.token, dto.platform);
  }

  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UnregisterDeviceDto,
  ): Promise<void> {
    return this.notifications.unregisterDevice(user.id, dto.token);
  }

  // --- Preferences ---------------------------------------------------------

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<NotificationPreferences> {
    return this.notifications.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    return this.notifications.updatePreferences(user.id, dto);
  }
}
