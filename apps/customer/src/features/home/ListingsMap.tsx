import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { NearbyListing } from '@rescuebite/types';
import { EmptyState, PriceTag } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import type { Coords } from '../../lib/location';
import { isExpoGo } from '../../lib/runtime';

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  listings: NearbyListing[];
}

function precisionFor(latitudeDelta: number): number {
  if (latitudeDelta > 0.2) return 1;
  if (latitudeDelta > 0.05) return 2;
  return 3;
}

function clusterListings(listings: NearbyListing[], precision: number): Cluster[] {
  const groups = new Map<string, Cluster>();
  for (const listing of listings) {
    const key = `${listing.store.lat.toFixed(precision)},${listing.store.lng.toFixed(precision)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.listings.push(listing);
    } else {
      groups.set(key, { key, lat: listing.store.lat, lng: listing.store.lng, listings: [listing] });
    }
  }
  return [...groups.values()];
}

export function ListingsMap({
  listings,
  center,
  onSelect,
}: {
  listings: NearbyListing[];
  center: Coords;
  onSelect: (listing: NearbyListing) => void;
}) {
  const [region, setRegion] = useState<Region>({
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [peek, setPeek] = useState<NearbyListing | null>(null);

  const clusters = useMemo(
    () => clusterListings(listings, precisionFor(region.latitudeDelta)),
    [listings, region.latitudeDelta],
  );

  // react-native-maps has no native module in Expo Go — show a fallback there.
  if (isExpoGo) {
    return (
      <View style={[styles.fill, styles.center]}>
        <EmptyState
          title="Map needs a dev build"
          description="Switch back to the list view to browse. The map runs in a development or production build."
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <MapView
        style={styles.fill}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
      >
        {clusters.map((cluster) => {
          const isCluster = cluster.listings.length > 1;
          const cheapest = cluster.listings.reduce((a, b) => (a.price < b.price ? a : b));
          return (
            <Marker
              key={cluster.key}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              onPress={() => setPeek(isCluster ? cheapest : (cluster.listings[0] ?? null))}
            >
              <View style={[styles.pin, isCluster && styles.pinCluster]}>
                <Text style={styles.pinText}>
                  {isCluster ? cluster.listings.length : `€${(cheapest.price / 100).toFixed(0)}`}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {peek ? (
        <Pressable style={styles.peek} onPress={() => onSelect(peek)} accessibilityRole="button">
          <Image source={peek.imageUrl ?? undefined} style={styles.peekImage} contentFit="cover" />
          <View style={styles.peekBody}>
            <Text style={styles.peekStore} numberOfLines={1}>
              {peek.store.name}
            </Text>
            <Text style={styles.peekTitle} numberOfLines={1}>
              {peek.title}
            </Text>
            <PriceTag
              originalMinor={peek.originalPrice}
              priceMinor={peek.price}
              currency={peek.currency}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pin: {
    backgroundColor: colors.brand[600],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: 2,
    borderColor: colors.neutral[0],
    minWidth: 32,
    alignItems: 'center',
  },
  pinCluster: { backgroundColor: colors.accent[700] },
  pinText: { color: colors.neutral[0], fontWeight: '700', fontSize: typography.fontSize.xs },
  peek: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[5],
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  peekImage: { width: 96, height: 96, backgroundColor: colors.neutral[100] },
  peekBody: { flex: 1, padding: spacing[3], gap: spacing[1], justifyContent: 'center' },
  peekStore: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  peekTitle: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.neutral[900] },
});
