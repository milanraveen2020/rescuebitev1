import { validateEnv } from './env.schema';

const base = {
  DATABASE_URL: 'postgresql://user@localhost:5432/db',
  JWT_SECRET: 'a-sufficiently-long-secret',
};

describe('validateEnv', () => {
  it('applies defaults and coerces/transforms values', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(Array.isArray(env.CORS_ORIGINS)).toBe(true);
  });

  it('coerces PORT and splits CORS_ORIGINS into a trimmed array', () => {
    const env = validateEnv({
      ...base,
      PORT: '8080',
      CORS_ORIGINS: 'http://a.test, http://b.test ',
    });
    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('throws when a required var is missing', () => {
    expect(() => validateEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('throws on a non-postgres DATABASE_URL', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('throws on a too-short JWT_SECRET', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow();
  });
});
