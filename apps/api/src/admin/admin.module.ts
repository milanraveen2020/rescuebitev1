import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService],
})
export class AdminModule {}
