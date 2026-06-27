import * as SecureStore from 'expo-secure-store';

/**
 * Refresh tokens live in the device secure enclave (Keychain / Keystore) via
 * expo-secure-store. Access tokens are kept in memory only (in the auth context).
 */
const REFRESH_KEY = 'rb_refresh_token';

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function clearStoredRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
