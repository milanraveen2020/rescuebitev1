import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createApiClient', () => {
  it('calls the configured baseUrl + path with the provided fetch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await client.GET('/health');

    const request = fetchImpl.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('http://api.test/health');
    expect(request.method).toBe('GET');
  });

  it('attaches the bearer token from getAuthToken', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetchImpl,
      getAuthToken: () => 'token-123',
    });

    await client.GET('/health');

    const request = fetchImpl.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('authorization')).toBe('Bearer token-123');
  });

  it('omits the auth header when no token is available', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetchImpl,
      getAuthToken: () => null,
    });

    await client.GET('/health');

    const request = fetchImpl.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('authorization')).toBeNull();
  });
});
