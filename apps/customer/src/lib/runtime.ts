import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside Expo Go (the App Store client), which lacks custom
 * native modules like Stripe and react-native-maps. Used to gracefully degrade
 * those surfaces so the app is testable without a dev build.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
