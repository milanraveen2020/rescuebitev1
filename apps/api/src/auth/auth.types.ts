import type { UserRole } from '@rescuebite/types';

/** The authenticated principal attached to the request by JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Name of the httpOnly refresh cookie used by web clients. */
export const REFRESH_COOKIE = 'rb_refresh';

/** Header a mobile client sends so the refresh token is returned in the body. */
export const CLIENT_TYPE_HEADER = 'x-client-type';
