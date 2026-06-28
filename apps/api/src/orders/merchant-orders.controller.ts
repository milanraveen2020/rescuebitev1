import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { OrderDetail, StoreOrders } from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CollectOrderDto, OrderDetailDto, StoreOrdersDto } from './orders.dto';
import { OrdersService } from './orders.service';

/** Merchant-facing order endpoints (store-scoped). */
@ApiTags('merchant-orders')
@ApiBearerAuth()
@Roles('MERCHANT_OWNER', 'MERCHANT_STAFF')
@Controller()
export class MerchantOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('stores/:id/orders')
  @ApiOkResponse({ schema: StoreOrdersDto.openApiSchema })
  storeOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) storeId: string,
  ): Promise<StoreOrders> {
    return this.orders.storeOrders(user.id, storeId);
  }

  @Post('orders/:id/collect')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  collect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CollectOrderDto,
  ): Promise<OrderDetail> {
    return this.orders.collect(user.id, id, dto.pickupCode);
  }

  @Post('orders/:id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  noShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.orders.markNoShow(user.id, id);
  }
}
