import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { DevicePlatform } from '@rescuebite/types';
import { notificationsApi } from '../api/endpoints';
import { isExpoGo } from './runtime';

/**
 * Expo push registration. Best-effort: any failure (denied permission, Expo Go,
 * simulator) resolves to null so it never blocks auth. Remote push requires a
 * dev/standalone build, so we skip token retrieval under Expo Go.
 */

// Show a banner + bump the badge when a push arrives in the foreground.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
});

function devicePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/** Register this device's Expo push token with the API. Returns the token, or null. */
export async function registerForPush(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return null;

    const id = projectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : {});
    await notificationsApi.registerDevice({ token, platform: devicePlatform() });
    return token;
  } catch {
    return null;
  }
}

export async function unregisterPush(token: string): Promise<void> {
  await notificationsApi.unregisterDevice(token).catch(() => undefined);
}
