import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NearbyListing } from '@rescuebite/types';
import { Badge, PickupWindowChip, PriceTag } from '@rescuebite/ui/native';
import { colors, radii, spacing, typography } from '@rescuebite/ui/tokens';
import { useFavorites } from '../../favorites/FavoritesContext';

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function ListingCard({ listing, onPress }: { listing: NearbyListing; onPress: () => void }) {
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(listing.store.id);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title} from ${listing.store.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View>
        <Image
          source={listing.imageUrl ?? undefined}
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4' }}
        />
        <Pressable
          onPress={() => toggle(listing.store.id)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
          style={styles.heart}
        >
          <Text style={{ fontSize: 18 }}>{favorite ? '❤️' : '🤍'}</Text>
        </Pressable>
        {listing.quantityRemaining <= 3 ? (
          <View style={styles.lowStock}>
            <Badge label={`${listing.quantityRemaining} left`} tone="accent" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <Text style={styles.store} numberOfLines={1}>
            {listing.store.name}
          </Text>
          <Text style={styles.distance}>{formatDistance(listing.distanceKm)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <PickupWindowChip start={listing.pickupStart} end={listing.pickupEnd} />
        <View style={styles.rowBetween}>
          <PriceTag
            originalMinor={listing.originalPrice}
            priceMinor={listing.price}
            currency={listing.currency}
          />
          <Text style={styles.rating}>★ {listing.store.rating.toFixed(1)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  pressed: { opacity: 0.95 },
  image: { width: '100%', height: 160, backgroundColor: colors.neutral[100] },
  heart: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.pill,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStock: { position: 'absolute', bottom: spacing[2], left: spacing[2] },
  body: { padding: spacing[3], gap: spacing[1] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  store: { fontSize: typography.fontSize.sm, color: colors.neutral[500], flex: 1 },
  distance: { fontSize: typography.fontSize.sm, color: colors.neutral[500] },
  title: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.neutral[900] },
  rating: { fontSize: typography.fontSize.sm, color: colors.neutral[700], fontWeight: '500' },
});
