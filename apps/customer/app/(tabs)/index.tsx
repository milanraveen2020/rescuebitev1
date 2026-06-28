import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { FoodCategory, ListingSort, NearbyListing } from '@rescuebite/types';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { EmptyState } from '@rescuebite/ui/native';
import { useNearbyListings } from '../../src/api/queries';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { CategoryChips, SortChips } from '../../src/features/home/Filters';
import { ListingCard } from '../../src/features/home/ListingCard';
import { ListingsMap } from '../../src/features/home/ListingsMap';
import { getCurrentCoords, type Coords } from '../../src/lib/location';

export default function HomeScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [sort, setSort] = useState<ListingSort>('distance');
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    void getCurrentCoords().then(setCoords);
  }, []);

  const query = useMemo(
    () => ({
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      radiusKm: 10,
      sort,
      ...(category ? { category } : {}),
    }),
    [coords, sort, category],
  );

  const feed = useNearbyListings(query, coords !== null);
  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) => l.title.toLowerCase().includes(q) || l.store.name.toLowerCase().includes(q),
    );
  }, [items, search]);

  const open = (listing: NearbyListing) => router.push(`/listing/${listing.id}`);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>RescueBite</Text>
        <Pressable
          onPress={() => setView((v) => (v === 'list' ? 'map' : 'list'))}
          accessibilityRole="button"
          accessibilityLabel={view === 'list' ? 'Show map' : 'Show list'}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>{view === 'list' ? '🗺️ Map' : '📋 List'}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bags or stores"
          placeholderTextColor={colors.neutral[400]}
          style={styles.searchInput}
          accessibilityLabel="Search"
          returnKeyType="search"
        />
      </View>

      <CategoryChips selected={category} onSelect={setCategory} />
      <SortChips selected={sort} onSelect={setSort} />

      {feed.isLoading || coords === null ? (
        <ListingsSkeleton />
      ) : feed.isError ? (
        <ErrorView message="We couldn’t load nearby bags." onRetry={() => void feed.refetch()} />
      ) : view === 'map' ? (
        <ListingsMap listings={filtered} center={coords} onSelect={open} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard listing={item} onPress={() => open(item)} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing[4] }} />}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching && !feed.isFetchingNextPage}
              onRefresh={() => void feed.refetch()}
              tintColor={colors.brand[600]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No bags nearby right now"
              description="Try a different category, or check back closer to the evening."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  brand: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.brand[700] },
  toggle: { backgroundColor: colors.neutral[100], borderRadius: radii.pill, paddingHorizontal: spacing[3], paddingVertical: spacing[1], minHeight: 36, justifyContent: 'center' },
  toggleText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.neutral[700] },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[100],
    borderRadius: radii.md,
    minHeight: 44,
    gap: spacing[2],
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.neutral[900] },
  listContent: { padding: spacing[4] },
});
