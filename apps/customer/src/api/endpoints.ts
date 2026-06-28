import {
  AuthResponseSchema,
  CheckoutSessionSchema,
  ListingDetailSchema,
  NearbyListingPageSchema,
  OrderDetailSchema,
  OrderHistorySchema,
  ReviewSchema,
  UserSchema,
  type AuthResponse,
  type CheckoutSession,
  type CreateOrderInput,
  type CreateReviewInput,
  type ListingDetail,
  type LoginInput,
  type NearbyListingPage,
  type NearbyQuery,
  type OrderDetail,
  type OrderHistory,
  type RegisterCustomerInput,
  type Review,
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
    return AuthResponseSchema.parse(await unwrap(() => api.POST('/auth/login', { body: input } as Init)));
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
    return OrderDetailSchema.parse(await unwrap(() => api.POST('/orders', { body: input } as Init)));
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
