/**
 * In-memory token holder shared by the API client and the auth context. The
 * access token lives only in memory; the refresh token is persisted in secure
 * store (see ../auth/storage). Kept separate from AuthContext to avoid cycles.
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onExpire: (() => void) | null = null;

export const session = {
  getAccessToken: (): string | null => accessToken,
  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },
  getRefreshToken: (): string | null => refreshToken,
  setRefreshToken: (token: string | null): void => {
    refreshToken = token;
  },
  /** Registered by AuthContext to clear state when a refresh ultimately fails. */
  setOnExpire: (cb: (() => void) | null): void => {
    onExpire = cb;
  },
  expire: (): void => {
    accessToken = null;
    refreshToken = null;
    onExpire?.();
  },
};
