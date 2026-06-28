import {
  PlatformSettingsSchema,
  type PlatformSettings,
  type UpdateSettingsInput,
} from '@rescuebite/types';
import { apiRequest, jsonInit } from '@/lib/request';

export async function getSettings(): Promise<PlatformSettings> {
  return PlatformSettingsSchema.parse(await apiRequest('/admin/settings'));
}

export async function updateSettings(input: UpdateSettingsInput): Promise<PlatformSettings> {
  return PlatformSettingsSchema.parse(
    await apiRequest('/admin/settings', jsonInit('PATCH', input)),
  );
}
