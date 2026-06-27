import {
  CreateListingSchema,
  ListingDetailSchema,
  ListingSchema,
  NearbyListingPageSchema,
  NearbyQuerySchema,
  UpdateListingSchema,
  UploadRequestSchema,
  UploadTicketSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

// Request DTOs — validated by the global ZodValidationPipe.
export class CreateListingDto extends createZodDto(CreateListingSchema) {}
export class UpdateListingDto extends createZodDto(UpdateListingSchema) {}
export class NearbyQueryDto extends createZodDto(NearbyQuerySchema) {}
export class UploadRequestDto extends createZodDto(UploadRequestSchema) {}

// Response DTOs — Swagger documentation.
export class ListingDto extends createZodDto(ListingSchema) {}
export class ListingDetailDto extends createZodDto(ListingDetailSchema) {}
export class NearbyListingPageDto extends createZodDto(NearbyListingPageSchema) {}
export class UploadTicketDto extends createZodDto(UploadTicketSchema) {}
