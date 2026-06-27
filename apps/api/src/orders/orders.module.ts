import { Module } from '@nestjs/common';
import { MerchantOrdersController } from './merchant-orders.controller';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController, MerchantOrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrdersService],
})
export class OrdersModule {}
