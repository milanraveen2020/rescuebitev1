import Constants from 'expo-constants';
import {
  ApiErrorResponseSchema,
  AuthResponseSchema,
  UserSchema,
  type ApiErrorCode,
  type AuthResponse,
  type LoginInput,
  type RegisterCustomerInput,
  type User,
} from '@rescuebite/types';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
const BASE_URL = extra?.apiBaseUrl ?? 'http://localhost:4000';

/** Error carrying the API's typed error code, so screens can branch on it. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  accessToken?: string;
}

async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        // Tells the API to return the refresh token in the body (mobile has no cookies).
        'x-client-type': 'mobile',
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApiError('internal_error', 'Could not reach RescueBite. Check your connection.');
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(json);
    throw parsed.success
      ? new ApiError(parsed.data.error.code, parsed.data.error.message)
      : new ApiError('internal_error', 'Something went wrong. Please try again.');
  }
  return json;
}

/** Typed auth endpoints used by the mobile app. */
export const authApi = {
  async registerCustomer(input: RegisterCustomerInput): Promise<AuthResponse> {
    return AuthResponseSchema.parse(
      await request('/auth/register/customer', { method: 'POST', body: input }),
    );
  },
  async login(input: LoginInput): Promise<AuthResponse> {
    return AuthResponseSchema.parse(await request('/auth/login', { method: 'POST', body: input }));
  },
  async refresh(refreshToken: string): Promise<AuthResponse> {
    return AuthResponseSchema.parse(
      await request('/auth/refresh', { method: 'POST', body: { refreshToken } }),
    );
  },
  async logout(refreshToken: string): Promise<void> {
    await request('/auth/logout', { method: 'POST', body: { refreshToken } });
  },
  async me(accessToken: string): Promise<User> {
    return UserSchema.parse(await request('/auth/me', { accessToken }));
  },
};
