import { z } from 'zod';

/**
 * Environment schema — the single source of truth for every env var the API reads.
 * `validateEnv` runs at boot (via ConfigModule) so the process fails fast with a
 * clear message if anything is missing or malformed, rather than crashing later.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().refine((u) => u.startsWith('postgres'), {
    message: 'DATABASE_URL must be a PostgreSQL connection string',
  }),
  /** Comma-separated list of allowed CORS origins; parsed into a string array. */
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parse + validate raw env. Throws a single aggregated error on failure. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
