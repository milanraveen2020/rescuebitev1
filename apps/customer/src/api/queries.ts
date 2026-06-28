import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type {
  CreateOrderInput,
  CreateReviewInput,
  NearbyListingPage,
  NearbyQuery,
  NotificationPage,
  UpdateNotificationPreferencesInput,
} from '@rescuebite/types';
import { listingsApi, notificationsApi, ordersApi } from './endpoints';

export const queryKeys = {
  nearby: (q: NearbyFeedQuery) => ['listings', 'nearby', q] as const,
  listing: (id: string) => ['listings', id] as const,
  orders: () => ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  notifications: () => ['notifications'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
  notificationPreferences: () => ['notifications', 'preferences'] as const,
};

export type NearbyFeedQuery = Omit<NearbyQuery, 'cursor' | 'limit'>;

/** Infinite, cursor-paginated nearby feed. */
export function useNearbyListings(
  query: NearbyFeedQuery,
  enabled = true,
): UseInfiniteQueryResult<{ pages: NearbyListingPage[]; pageParams: unknown[] }, Error> {
  return useInfiniteQuery({
    queryKey: queryKeys.nearby(query),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listingsApi.nearby({ ...query, limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: queryKeys.listing(id),
    queryFn: () => listingsApi.detail(id),
  });
}

export function useOrders() {
  return useQuery({ queryKey: queryKeys.orders(), queryFn: () => ordersApi.history() });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: queryKeys.order(id), queryFn: () => ordersApi.detail(id) });
}

export function useReserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.reserve(input),
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders() });
      void qc.invalidateQueries({ queryKey: queryKeys.listing(order.listingId) });
      void qc.invalidateQueries({ queryKey: ['listings', 'nearby'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders() });
      void qc.invalidateQueries({ queryKey: queryKeys.order(order.id) });
    },
  });
}

export function useReviewOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateReviewInput }) =>
      ordersApi.review(id, input),
    onSuccess: (_review, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders() });
      void qc.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });
}

// --- Notifications ---------------------------------------------------------

/** Infinite, cursor-paginated notification inbox. */
export function useNotifications(
  enabled = true,
): UseInfiniteQueryResult<{ pages: NotificationPage[]; pageParams: unknown[] }, Error> {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Unread badge count; polls so the badge stays fresh while the app is open. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.unreadCount(),
    enabled,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
      void qc.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications() });
      void qc.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences(),
    queryFn: () => notificationsApi.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      notificationsApi.updatePreferences(input),
    onSuccess: (prefs) => qc.setQueryData(queryKeys.notificationPreferences(), prefs),
  });
}
