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
import type { OrderDetail, OrderHistory, Review } from '@rescuebite/types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateOrderDto,
  CreateReviewDto,
  OrderDetailDto,
  OrderHistoryDto,
  ReviewDto,
} from './orders.dto';
import { OrdersService } from './orders.service';

/** Customer-facing order endpoints. */
@ApiTags('orders')
@ApiBearerAuth()
@Roles('CUSTOMER')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  reserve(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDetail> {
    return this.orders.reserve(user.id, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.orders.pay(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.orders.cancel(user.id, id);
  }

  @Get()
  @ApiOkResponse({ schema: OrderHistoryDto.openApiSchema })
  history(@CurrentUser() user: AuthenticatedUser): Promise<OrderHistory> {
    return this.orders.history(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ schema: OrderDetailDto.openApiSchema })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetail> {
    return this.orders.getOne(user.id, id);
  }

  @Post(':id/review')
  @ApiOkResponse({ schema: ReviewDto.openApiSchema })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<Review> {
    return this.orders.review(user.id, id, dto);
  }
}
