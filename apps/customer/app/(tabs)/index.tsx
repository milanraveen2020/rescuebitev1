import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Map as MapIcon, Search } from 'lucide-react-native';
import type { FoodCategory, ListingSort, NearbyListing } from '@rescuebite/types';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { EmptyState } from '@rescuebite/ui/native';
import { useNearbyListings } from '../../src/api/queries';
import { EmptyBox } from '../../src/components/EmptyBox';
import { MysteryBoxLogo } from '../../src/components/MysteryBoxLogo';
import { Screen } from '../../src/components/Screen';
import { ErrorView, ListingsSkeleton } from '../../src/components/States';
import { CategoryChips, SortChips } from '../../src/features/home/Filters';
import { ListingCard } from '../../src/features/home/ListingCard';
import { getCurrentCoords, type Coords } from '../../src/lib/location';

export default function HomeScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [sort, setSort] = useState<ListingSort>('distance');

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

  // Fetch the next page as the user nears the bottom (replaces FlatList's
  // onEndReached now that the feed scrolls inside a ScrollView).
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 400;
    if (nearBottom && feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  };

  const loading = feed.isLoading || coords === null;

  return (
    <Screen>
      <ScrollView
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.brand[700]}
          />
        }
      >
        {/* [0] Scrolls away with the content */}
        <View>
          <View style={styles.header}>
            <MysteryBoxLogo height={28} />
            <Pressable
              onPress={() => router.push('/map')}
              accessibilityRole="button"
              accessibilityLabel="Map of bags near you"
              style={styles.mapBtn}
            >
              <MapIcon size={16} color={colors.neutral[700]} />
              <Text style={styles.mapBtnText}>Map</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Search size={18} color={colors.neutral[400]} />
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
        </View>

        {/* [1] Pins to the top once it reaches it */}
        <View style={styles.stickyFilters}>
          <CategoryChips selected={category} onSelect={setCategory} />
          <SortChips selected={sort} onSelect={setSort} />
        </View>

        {/* [2] Feed content */}
        {loading ? (
          <ListingsSkeleton />
        ) : feed.isError ? (
          <ErrorView message="We couldn’t load nearby bags." onRetry={() => void feed.refetch()} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <EmptyBox size={120} />
            <EmptyState
              title="No boxes nearby right now"
              titleStyle={styles.emptyTitle}
              description="Try a different category, or check back closer to the evening."
            />
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <ListingCard key={item.id} listing={item} onPress={() => open(item)} />
            ))}
            {feed.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand[700]} style={styles.more} />
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing[6] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    height: 44,
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    backgroundColor: colors.surface.card,
  },
  mapBtnText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.neutral[700] },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    minHeight: 52,
    gap: spacing[2],
  },
  searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.neutral[900] },
  // Opaque page background so feed cards scroll cleanly underneath when pinned.
  stickyFilters: { backgroundColor: colors.surface.page, paddingTop: spacing[2] },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[4] },
  more: { paddingVertical: spacing[4] },
  empty: { paddingTop: spacing[8], alignItems: 'center', gap: spacing[2] },
  emptyTitle: { fontSize: typography.fontSize.xl },
});
