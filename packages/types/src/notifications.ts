import { z } from 'zod';
import { DevicePlatformSchema } from './enums.js';
import { NotificationSchema } from './entities.js';
import { CursorPageSchema } from './pagination.js';

/**
 * Notification contracts: the in-app inbox (cursor-paginated), unread badge,
 * device-token registration for push, and per-user notification preferences.
 */

export const NotificationPageSchema = CursorPageSchema(NotificationSchema);
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

export const UnreadCountSchema = z.object({ unread: z.number().int().nonnegative() });
export type UnreadCount = z.infer<typeof UnreadCountSchema>;

export const RegisterDeviceSchema = z.object({
  token: z.string().min(1).max(255),
  platform: DevicePlatformSchema,
});
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;

export const UnregisterDeviceSchema = z.object({ token: z.string().min(1).max(255) });
export type UnregisterDeviceInput = z.infer<typeof UnregisterDeviceSchema>;

/**
 * Per-user notification preferences. Two channel master switches plus a few
 * category opt-outs. Missing/unset preferences default to everything on.
 */
export const NotificationPreferencesSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  orderUpdates: z.boolean(),
  pickupReminders: z.boolean(),
  newBagsNearby: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push: true,
  email: true,
  orderUpdates: true,
  pickupReminders: true,
  newBagsNearby: true,
};

/** Partial update of preferences — only the provided keys change. */
export const UpdateNotificationPreferencesSchema = NotificationPreferencesSchema.partial();
export type UpdateNotificationPreferencesInput = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;
