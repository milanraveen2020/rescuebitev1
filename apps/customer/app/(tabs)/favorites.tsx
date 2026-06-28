import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState } from '@rescuebite/ui/native';
import { colors, spacing, typography } from '@rescuebite/ui/tokens';
import { useNearbyListings } from '../../src/api/queries';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { ListingCard } from '../../src/features/home/ListingCard';
import { useFavorites } from '../../src/favorites/FavoritesContext';
import { getCurrentCoords, type Coords } from '../../src/lib/location';

export default function FavoritesScreen() {
  const router = useRouter();
  const { ids, ready } = useFavorites();
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    void getCurrentCoords().then(setCoords);
  }, []);

  const feed = useNearbyListings(
    { lat: coords?.lat ?? 0, lng: coords?.lng ?? 0, radiusKm: 25, sort: 'distance' },
    coords !== null && ids.length > 0,
  );

  const items = useMemo(
    () => (feed.data?.pages.flatMap((p) => p.items) ?? []).filter((l) => ids.includes(l.store.id)),
    [feed.data, ids],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Favorites</Text>
      </View>

      {!ready ? (
        <ListingsSkeleton count={2} />
      ) : ids.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No favorites yet"
            description="Tap the heart on a store to save it here."
            action={<Button label="Discover bags" onPress={() => router.replace('/')} />}
          />
        </View>
      ) : feed.isLoading || coords === null ? (
        <ListingsSkeleton count={2} />
      ) : feed.isError ? (
        <ErrorView onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          )}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing[4] }} />}
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching}
              onRefresh={() => void feed.refetch()}
              tintColor={colors.brand[600]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Nothing available right now"
              description="Your favorite stores don’t have bags nearby at the moment."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  heading: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.brand[700] },
  content: { padding: spacing[4] },
  center: { flex: 1, justifyContent: 'center' },
});
