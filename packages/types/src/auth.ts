import { z } from 'zod';
import { FoodCategorySchema } from './enums.js';
import { UserSchema } from './entities.js';

/**
 * Auth request/response contracts — the single source of truth shared by the API
 * and all three frontends. Responses never include `passwordHash` (it isn't part
 * of UserSchema). Dates are serialized ISO strings.
 */

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100);

export const EmailSchema = z.string().email().toLowerCase();

// --- Registration ----------------------------------------------------------

export const RegisterCustomerSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(20).optional(),
});
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerSchema>;

/** Store details supplied when a merchant applies. The created store is PENDING. */
export const StoreApplicationSchema = z.object({
  name: z.string().min(1).max(120),
  category: FoodCategorySchema,
  description: z.string().max(2000).optional(),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type StoreApplicationInput = z.infer<typeof StoreApplicationSchema>;

export const RegisterMerchantSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(20).optional(),
  store: StoreApplicationSchema,
});
export type RegisterMerchantInput = z.infer<typeof RegisterMerchantSchema>;

// --- Session ---------------------------------------------------------------

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Refresh token may arrive via httpOnly cookie (web) or request body (mobile). */
export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshRequestInput = z.infer<typeof RefreshRequestSchema>;

export const RequestPasswordResetSchema = z.object({
  email: EmailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

// --- Responses -------------------------------------------------------------

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  /** Access-token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
  /** Present only for mobile clients; web receives an httpOnly cookie instead. */
  refreshToken: z.string().optional(),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const MessageResponseSchema = z.object({
  message: z.string(),
});
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/** Claims embedded in the access token (JWT payload). */
export const AccessTokenClaimsSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: UserSchema.shape.role,
  type: z.literal('access'),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;
