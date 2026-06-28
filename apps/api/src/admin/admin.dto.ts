import {
  AdminListingQuerySchema,
  AdminOrderQuerySchema,
  AdminOverviewQuerySchema,
  AdminReviewQuerySchema,
  AdminStoreQuerySchema,
  AdminUserQuerySchema,
  AuditLogQuerySchema,
  BulkIdsSchema,
  HideReviewSchema,
  RejectStoreSchema,
  SuspendUserSchema,
  UpdateSettingsSchema,
  UpdateUserRoleSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

// Query DTOs.
export class AdminOverviewQueryDto extends createZodDto(AdminOverviewQuerySchema) {}
export class AdminUserQueryDto extends createZodDto(AdminUserQuerySchema) {}
export class AdminStoreQueryDto extends createZodDto(AdminStoreQuerySchema) {}
export class AdminListingQueryDto extends createZodDto(AdminListingQuerySchema) {}
export class AdminOrderQueryDto extends createZodDto(AdminOrderQuerySchema) {}
export class AdminReviewQueryDto extends createZodDto(AdminReviewQuerySchema) {}
export class AuditLogQueryDto extends createZodDto(AuditLogQuerySchema) {}

// Body DTOs.
export class SuspendUserDto extends createZodDto(SuspendUserSchema) {}
export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {}
export class RejectStoreDto extends createZodDto(RejectStoreSchema) {}
export class HideReviewDto extends createZodDto(HideReviewSchema) {}
export class BulkIdsDto extends createZodDto(BulkIdsSchema) {}
export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
