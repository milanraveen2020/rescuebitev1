import {
  AuthResponseSchema,
  CheckoutSessionSchema,
  ListingDetailSchema,
  NearbyListingPageSchema,
  NotificationPageSchema,
  NotificationPreferencesSchema,
  NotificationSchema,
  OrderDetailSchema,
  OrderHistorySchema,
  ReviewSchema,
  UnreadCountSchema,
  UserSchema,
  type AuthResponse,
  type CheckoutSession,
  type CreateOrderInput,
  type CreateReviewInput,
  type ListingDetail,
  type LoginInput,
  type NearbyListingPage,
  type NearbyQuery,
  type Notification,
  type NotificationPage,
  type NotificationPreferences,
  type OrderDetail,
  type OrderHistory,
  type RegisterCustomerInput,
  type RegisterDeviceInput,
  type Review,
  type UnreadCount,
  type UpdateNotificationPreferencesInput,
  type User,
} from '@rescuebite/types';
import { api } from './client';
import { unwrap } from './request';

/**
 * Typed API surface for the customer app. Every component goes through these
 * functions — no raw fetch. Inputs are typed from @rescuebite/types and
 * responses are Zod-parsed at the boundary.
 *
 * The generated openapi-fetch types only describe responses + path params (the
 * API documents those with Swagger), so request body/query init is passed via a
 * narrow `as never` cast — callers still get full type-safety from the schemas.
 */
type Init = never;

export const authApi = {
  async login(input: LoginInput): Promise<AuthResponse> {
    return AuthResponseSchema.parse(
      await unwrap(() => api.POST('/auth/login', { body: input } as Init)),
    );
  },
  async registerCustomer(input: RegisterCustomerInput): Promise<AuthResponse> {
    return AuthResponseSchema.parse(
      await unwrap(() => api.POST('/auth/register/customer', { body: input } as Init)),
    );
  },
  async refresh(refreshToken: string): Promise<AuthResponse> {
    return AuthResponseSchema.parse(
      await unwrap(() => api.POST('/auth/refresh', { body: { refreshToken } } as Init)),
    );
  },
  async logout(refreshToken: string): Promise<void> {
    await unwrap(() => api.POST('/auth/logout', { body: { refreshToken } } as Init));
  },
  async me(): Promise<User> {
    return UserSchema.parse(await unwrap(() => api.GET('/auth/me')));
  },
};

export const listingsApi = {
  async nearby(query: NearbyQuery): Promise<NearbyListingPage> {
    return NearbyListingPageSchema.parse(
      await unwrap(() => api.GET('/listings/nearby', { params: { query } } as Init)),
    );
  },
  async detail(id: string): Promise<ListingDetail> {
    return ListingDetailSchema.parse(
      await unwrap(() => api.GET('/listings/{id}', { params: { path: { id } } })),
    );
  },
};

export const ordersApi = {
  async reserve(input: CreateOrderInput): Promise<OrderDetail> {
    return OrderDetailSchema.parse(
      await unwrap(() => api.POST('/orders', { body: input } as Init)),
    );
  },
  async history(): Promise<OrderHistory> {
    return OrderHistorySchema.parse(await unwrap(() => api.GET('/orders')));
  },
  async detail(id: string): Promise<OrderDetail> {
    return OrderDetailSchema.parse(
      await unwrap(() => api.GET('/orders/{id}', { params: { path: { id } } })),
    );
  },
  async cancel(id: string): Promise<OrderDetail> {
    return OrderDetailSchema.parse(
      await unwrap(() => api.POST('/orders/{id}/cancel', { params: { path: { id } } })),
    );
  },
  async review(id: string, input: CreateReviewInput): Promise<Review> {
    return ReviewSchema.parse(
      await unwrap(() =>
        api.POST('/orders/{id}/review', { params: { path: { id } }, body: input } as Init),
      ),
    );
  },
};

export const paymentsApi = {
  async checkout(orderId: string): Promise<CheckoutSession> {
    return CheckoutSessionSchema.parse(
      await unwrap(() =>
        api.POST('/payments/orders/{id}/checkout', { params: { path: { id: orderId } } }),
      ),
    );
  },
};

export const notificationsApi = {
  async list(cursor?: string): Promise<NotificationPage> {
    const query = cursor ? { cursor, limit: 20 } : { limit: 20 };
    return NotificationPageSchema.parse(
      await unwrap(() => api.GET('/notifications', { params: { query } } as Init)),
    );
  },
  async unreadCount(): Promise<UnreadCount> {
    return UnreadCountSchema.parse(await unwrap(() => api.GET('/notifications/unread-count')));
  },
  async markRead(id: string): Promise<Notification> {
    return NotificationSchema.parse(
      await unwrap(() => api.POST('/notifications/{id}/read', { params: { path: { id } } })),
    );
  },
  async markAllRead(): Promise<void> {
    await unwrap(() => api.POST('/notifications/read-all'));
  },
  async registerDevice(input: RegisterDeviceInput): Promise<void> {
    await unwrap(() => api.POST('/notifications/devices', { body: input } as Init));
  },
  async unregisterDevice(token: string): Promise<void> {
    await unwrap(() => api.DELETE('/notifications/devices', { body: { token } } as Init));
  },
  async getPreferences(): Promise<NotificationPreferences> {
    return NotificationPreferencesSchema.parse(
      await unwrap(() => api.GET('/notifications/preferences')),
    );
  },
  async updatePreferences(
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    return NotificationPreferencesSchema.parse(
      await unwrap(() => api.PATCH('/notifications/preferences', { body: input } as Init)),
    );
  },
};
