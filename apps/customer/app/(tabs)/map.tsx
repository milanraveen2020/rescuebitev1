import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import type { NearbyListing } from '@rescuebite/types';
import { useNearbyListings } from '../../src/api/queries';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { ListingsMap } from '../../src/features/home/ListingsMap';
import { getCurrentCoords, type Coords } from '../../src/lib/location';

export default function MapScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    void getCurrentCoords().then(setCoords);
  }, []);

  const feed = useNearbyListings(
    { lat: coords?.lat ?? 0, lng: coords?.lng ?? 0, radiusKm: 15, sort: 'distance' },
    coords !== null,
  );
  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const open = (listing: NearbyListing) => router.push(`/listing/${listing.id}`);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Bags near you</Text>
        <Text style={styles.sub}>Tap a pin to peek, tap the card to open</Text>
      </View>
      {feed.isLoading || coords === null ? (
        <ListingsSkeleton count={2} />
      ) : feed.isError ? (
        <ErrorView onRetry={() => void feed.refetch()} />
      ) : (
        <View style={styles.mapWrap}>
          <ListingsMap listings={items} center={coords} onSelect={open} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] },
  heading: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.neutral[900] },
  sub: { fontSize: typography.fontSize.sm, color: colors.neutral[500], marginTop: spacing[1] },
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: 28,
    overflow: 'hidden',
  },
});
