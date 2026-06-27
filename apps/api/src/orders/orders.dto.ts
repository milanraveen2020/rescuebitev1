import {
  CollectOrderSchema,
  CreateOrderSchema,
  CreateReviewSchema,
  OrderDetailSchema,
  OrderHistorySchema,
  ReviewSchema,
  StoreOrdersSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

// Request DTOs.
export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class CollectOrderDto extends createZodDto(CollectOrderSchema) {}
export class CreateReviewDto extends createZodDto(CreateReviewSchema) {}

// Response DTOs (Swagger docs).
export class OrderDetailDto extends createZodDto(OrderDetailSchema) {}
export class OrderHistoryDto extends createZodDto(OrderHistorySchema) {}
export class StoreOrdersDto extends createZodDto(StoreOrdersSchema) {}
export class ReviewDto extends createZodDto(ReviewSchema) {}
