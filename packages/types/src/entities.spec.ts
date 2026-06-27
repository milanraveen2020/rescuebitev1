import { describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema } from './result';

describe('ApiErrorResponseSchema', () => {
  it('parses the canonical { error: { code, message } } envelope', () => {
    const parsed = ApiErrorResponseSchema.parse({
      error: { code: 'not_found', message: 'Nope' },
    });
    expect(parsed.error.code).toBe('not_found');
  });

  it('rejects an unknown error code', () => {
    const result = ApiErrorResponseSchema.safeParse({
      error: { code: 'banana', message: 'x' },
    });
    expect(result.success).toBe(false);
  });
});
