import {
  InviteStaffSchema,
  MerchantAnalyticsQuerySchema,
  UpdateStoreSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

// Request DTOs — validated by the global ZodValidationPipe.
export class UpdateStoreDto extends createZodDto(UpdateStoreSchema) {}
export class InviteStaffDto extends createZodDto(InviteStaffSchema) {}
export class MerchantAnalyticsQueryDto extends createZodDto(MerchantAnalyticsQuerySchema) {}
