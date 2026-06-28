import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rb_onboarding_complete';

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}
