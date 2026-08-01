import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside Expo Go (the App Store client), which lacks custom
 * native modules like Stripe and react-native-maps. Used to gracefully degrade
 * those surfaces so the app is testable without a dev build.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * True when app.json has an Android Google Maps API key configured. Without
 * one, react-native-maps crashes the native process on mount (not a
 * catchable JS error), so callers must check this before rendering MapView.
 */
export const hasGoogleMapsKey = Boolean(
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey,
);
