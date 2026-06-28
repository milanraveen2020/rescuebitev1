import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import { PushService } from './push.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsDispatcher,
    NotificationLifecycleService,
    PushService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
