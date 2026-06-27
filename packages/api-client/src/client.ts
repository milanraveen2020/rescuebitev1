import createOpenApiClient, { type Client, type Middleware } from 'openapi-fetch';
import type { paths } from './generated/openapi.js';

/**
 * The RescueBite API client. Frontends import `createApiClient` and call typed
 * methods (`api.GET('/health')`, etc.) — never raw `fetch`. Paths, params,
 * request bodies, and responses are all typed from the generated OpenAPI schema,
 * so a breaking API change surfaces as a type error at build time.
 */

export interface ApiClientConfig {
  baseUrl: string;
  /** Returns the bearer token (or null) at call time, so token refreshes are picked up. */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Override fetch (e.g. for React Native or tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export type RescueBiteClient = Client<paths>;

export function createApiClient(config: ApiClientConfig): RescueBiteClient {
  const client = createOpenApiClient<paths>({
    baseUrl: config.baseUrl,
    ...(config.fetchImpl ? { fetch: config.fetchImpl } : {}),
  });

  if (config.getAuthToken) {
    const getAuthToken = config.getAuthToken;
    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        const token = await getAuthToken();
        if (token) request.headers.set('authorization', `Bearer ${token}`);
        return request;
      },
    };
    client.use(authMiddleware);
  }

  return client;
}
