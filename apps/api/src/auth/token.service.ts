import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { TokenType, type User } from '@prisma/client';
import { AccessTokenClaimsSchema, type AccessTokenClaims } from '@rescuebite/types';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface IssuedAccessToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Issues and validates tokens.
 *
 * Access tokens are short-lived JWTs. Refresh and verification tokens are opaque
 * random secrets returned to the client as `"<id>.<secret>"`; only an argon2 hash
 * of the secret is stored, and the id lets us look the record up without a
 * queryable hash. Refresh tokens are single-use and rotated on every refresh.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async signAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<IssuedAccessToken> {
    const claims: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const ttl = this.config.accessTokenTtl;
    const accessToken = await this.jwt.signAsync(claims, { expiresIn: ttl });
    return { accessToken, expiresIn: parseDurationSeconds(ttl) };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const payload: unknown = await this.jwt.verifyAsync(token);
      return AccessTokenClaimsSchema.parse(payload);
    } catch {
      throw new UnauthorizedException('Your session is invalid or has expired.');
    }
  }

  /** Create a refresh token; returns the raw `"<id>.<secret>"` to hand to the client. */
  async issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
    const secret = randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(secret, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlDays * DAY_MS);
    const record = await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, userAgent: userAgent ?? null },
    });
    return `${record.id}.${secret}`;
  }

  /**
   * Validate a refresh token and rotate it: the presented token is revoked and a
   * fresh one issued. Throws if missing/expired/revoked/reused.
   */
  async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
  ): Promise<{ userId: string; refreshToken: string }> {
    const userId = await this.consumeRefreshToken(rawToken);
    const refreshToken = await this.issueRefreshToken(userId, userAgent);
    return { userId, refreshToken };
  }

  /** Revoke a refresh token (logout). Silently ignores unknown/garbage tokens. */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const parsed = splitToken(rawToken);
    if (!parsed) return;
    await this.prisma.refreshToken.updateMany({
      where: { id: parsed.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Create a single-use verification/reset token; returns the raw `"<id>.<secret>"`. */
  async createVerificationToken(userId: string, type: TokenType, ttlMs: number): Promise<string> {
    const secret = randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(secret, { type: argon2.argon2id });
    const record = await this.prisma.verificationToken.create({
      data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + ttlMs) },
    });
    return `${record.id}.${secret}`;
  }

  /** Validate and consume (mark used) a verification token, returning its userId. */
  async consumeVerificationToken(rawToken: string, type: TokenType): Promise<string> {
    const parsed = splitToken(rawToken);
    if (!parsed) throw new UnauthorizedException('This link is invalid or has expired.');

    const record = await this.prisma.verificationToken.findUnique({ where: { id: parsed.id } });
    if (
      !record ||
      record.type !== type ||
      record.usedAt !== null ||
      record.expiresAt.getTime() < Date.now() ||
      !(await argon2.verify(record.tokenHash, parsed.secret))
    ) {
      throw new UnauthorizedException('This link is invalid or has expired.');
    }

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record.userId;
  }

  private async consumeRefreshToken(rawToken: string): Promise<string> {
    const parsed = splitToken(rawToken);
    if (!parsed) throw new UnauthorizedException('Your session has expired. Please sign in again.');

    const record = await this.prisma.refreshToken.findUnique({ where: { id: parsed.id } });
    if (
      !record ||
      record.revokedAt !== null ||
      record.expiresAt.getTime() < Date.now() ||
      !(await argon2.verify(record.tokenHash, parsed.secret))
    ) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return record.userId;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function splitToken(raw: string): { id: string; secret: string } | null {
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return null;
  return { id: raw.slice(0, dot), secret: raw.slice(dot + 1) };
}

/** Parse an `ms`-style duration ("15m", "7d", "3600s", or bare seconds) to seconds. */
export function parseDurationSeconds(ttl: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return 900;
  const value = Number(match[1]);
  switch (match[2]) {
    case 'ms':
      return Math.ceil(value / 1000);
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    case 'm':
      return value * 60;
    default:
      return value; // 's' or bare number
  }
}
