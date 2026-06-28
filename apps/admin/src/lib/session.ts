import { refreshSession } from './auth';

/**
 * Holds the admin access token in memory and attaches it to API calls. The
 * httpOnly refresh cookie mints a new access token on demand and recovers from a
 * 401 by refreshing once and retrying.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function tokenOrRefresh(): Promise<string> {
  if (accessToken) return accessToken;
  const session = await refreshSession();
  accessToken = session.accessToken;
  return accessToken;
}

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...init.headers, authorization: `Bearer ${token}` },
    });

  let response = await send(await tokenOrRefresh());
  if (response.status === 401) {
    const session = await refreshSession();
    accessToken = session.accessToken;
    response = await send(accessToken);
  }
  return response;
}
