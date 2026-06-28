import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Sensible default (Dublin city centre) when permission is denied. */
export const DEFAULT_COORDS: Coords = { lat: 53.3498, lng: -6.2603 };

export async function requestLocationPermission(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

export async function getCurrentCoords(): Promise<Coords> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return DEFAULT_COORDS;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return DEFAULT_COORDS;
  }
}
