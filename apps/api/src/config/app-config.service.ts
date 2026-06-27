import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed accessor over the validated environment. Inject this instead of reading
 * `process.env` directly — values are already coerced and validated by EnvSchema.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config.get('CORS_ORIGINS', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get accessTokenTtl(): string {
    return this.config.get('ACCESS_TOKEN_TTL', { infer: true });
  }

  get refreshTokenTtlDays(): number {
    return this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
  }

  get cookieDomain(): string | undefined {
    return this.config.get('COOKIE_DOMAIN', { infer: true });
  }

  get appWebUrl(): string {
    return this.config.get('APP_WEB_URL', { infer: true });
  }

  get s3(): {
    bucket?: string;
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrl?: string;
  } {
    return {
      bucket: this.config.get('S3_BUCKET', { infer: true }),
      region: this.config.get('S3_REGION', { infer: true }),
      endpoint: this.config.get('S3_ENDPOINT', { infer: true }),
      accessKeyId: this.config.get('S3_ACCESS_KEY_ID', { infer: true }),
      secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      publicUrl: this.config.get('S3_PUBLIC_URL', { infer: true }),
    };
  }
}
