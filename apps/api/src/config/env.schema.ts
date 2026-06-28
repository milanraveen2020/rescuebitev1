import { z } from 'zod';

/**
 * Environment schema — the single source of truth for every env var the API reads.
 * `validateEnv` runs at boot (via ConfigModule) so the process fails fast with a
 * clear message if anything is missing or malformed, rather than crashing later.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .refine((u) => u.startsWith('postgres'), {
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
  /** Access-token lifetime (any `ms`-style string, e.g. "15m"). Short-lived. */
  ACCESS_TOKEN_TTL: z.string().min(1).default('15m'),
  /** Refresh-token lifetime in days. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Optional cookie domain for the refresh cookie (leave unset for localhost). */
  COOKIE_DOMAIN: z.string().min(1).optional(),
  /** Base URL used to build email verification / password-reset links. */
  APP_WEB_URL: z.string().url().default('http://localhost:3001'),
  /** Minutes a reservation holds stock pending payment before auto-release. */
  RESERVATION_HOLD_MINUTES: z.coerce.number().int().positive().default(15),

  // S3-compatible object storage for listing images. When unset, the API falls
  // back to a dev stub so the upload flow is exercisable without real storage.
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  /** Public base URL where uploaded objects are served from. */
  S3_PUBLIC_URL: z.string().url().optional(),

  // Stripe (test mode). When unset, payment endpoints return a clear 503 and the
  // app still boots so non-payment features work in local dev.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).default('pk_test_unset'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** Platform commission in basis points (1000 = 10%). */
  PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(1000),

  // Email (Resend). When unset, emails are logged to the console instead of sent,
  // so the flow is exercisable in local dev without an API key.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default('RescueBite <hello@rescuebite.com>'),

  // Expo push. When unset, push notifications are logged instead of sent.
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),

  // Error monitoring (Sentry). When unset, monitoring is disabled entirely.
  SENTRY_DSN: z.string().url().optional(),
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
