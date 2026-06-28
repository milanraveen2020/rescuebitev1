import {
  CursorPaginationQuerySchema,
  RegisterDeviceSchema,
  UnregisterDeviceSchema,
  UpdateNotificationPreferencesSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

export class NotificationsQueryDto extends createZodDto(CursorPaginationQuerySchema) {}
export class RegisterDeviceDto extends createZodDto(RegisterDeviceSchema) {}
export class UnregisterDeviceDto extends createZodDto(UnregisterDeviceSchema) {}
export class UpdateNotificationPreferencesDto extends createZodDto(
  UpdateNotificationPreferencesSchema,
) {}
