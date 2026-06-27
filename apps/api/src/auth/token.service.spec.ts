import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { TokenType } from '@prisma/client';
import type { AppConfigService } from '../config/app-config.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import { TokenService, parseDurationSeconds } from './token.service';

interface Row {
  id: string;
  [key: string]: unknown;
}

/** Tiny in-memory stand-in for the Prisma models the TokenService touches. */
function fakePrisma() {
  const refresh = new Map<string, Row>();
  const verification = new Map<string, Row>();
  let seq = 0;
  return {
    refreshToken: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const id = `rt${++seq}`;
        const row: Row = { id, revokedAt: null, ...data };
        refresh.set(id, row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(refresh.get(where.id) ?? null),
      ),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = { ...refresh.get(where.id), ...data } as Row;
        refresh.set(where.id, row);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }: { where: { id?: string }; data: Record<string, unknown> }) => {
        for (const row of refresh.values()) {
          if ((where.id === undefined || row.id === where.id) && row.revokedAt === null) {
            Object.assign(row, data);
          }
        }
        return Promise.resolve({ count: 1 });
      }),
    },
    verificationToken: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const id = `vt${++seq}`;
        const row: Row = { id, usedAt: null, ...data };
        verification.set(id, row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(verification.get(where.id) ?? null),
      ),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = { ...verification.get(where.id), ...data } as Row;
        verification.set(where.id, row);
        return Promise.resolve(row);
      }),
    },
  };
}

function makeService(jwt: Partial<JwtService> = {}) {
  const prisma = fakePrisma();
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 'u1',
      email: 'a@b.test',
      role: 'CUSTOMER',
      type: 'access',
    }),
    ...jwt,
  } as unknown as JwtService;
  const config = { accessTokenTtl: '15m', refreshTokenTtlDays: 30 } as AppConfigService;
  const service = new TokenService(
    jwtService,
    prisma as unknown as PrismaService,
    config,
  );
  return { service, prisma, jwtService };
}

describe('parseDurationSeconds', () => {
  it.each([
    ['15m', 900],
    ['7d', 604800],
    ['2h', 7200],
    ['30s', 30],
    ['500ms', 1],
    ['3600', 3600],
    ['nonsense', 900],
  ])('parses %s -> %d', (input, expected) => {
    expect(parseDurationSeconds(input)).toBe(expected);
  });
});

describe('TokenService access tokens', () => {
  it('signs an access token with computed expiry', async () => {
    const { service } = makeService();
    const result = await service.signAccessToken({ id: 'u1', email: 'a@b.test', role: 'CUSTOMER' });
    expect(result).toEqual({ accessToken: 'signed.jwt.token', expiresIn: 900 });
  });

  it('rejects an invalid access token', async () => {
    const { service } = makeService({
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad signature')),
    });
    await expect(service.verifyAccessToken('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('TokenService refresh tokens', () => {
  it('issues a "<id>.<secret>" token and rotates it once', async () => {
    const { service } = makeService();
    const raw = await service.issueRefreshToken('u1', 'jest');
    expect(raw).toMatch(/^rt\d+\.[a-f0-9]{64}$/);

    const rotated = await service.rotateRefreshToken(raw);
    expect(rotated.userId).toBe('u1');
    expect(rotated.refreshToken).not.toBe(raw);
  });

  it('rejects reuse of a rotated (revoked) refresh token', async () => {
    const { service } = makeService();
    const raw = await service.issueRefreshToken('u1');
    await service.rotateRefreshToken(raw);
    await expect(service.rotateRefreshToken(raw)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a malformed refresh token', async () => {
    const { service } = makeService();
    await expect(service.rotateRefreshToken('not-a-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('TokenService verification tokens', () => {
  it('consumes a valid token once and rejects reuse', async () => {
    const { service } = makeService();
    const raw = await service.createVerificationToken('u1', TokenType.EMAIL_VERIFICATION, 60_000);

    await expect(
      service.consumeVerificationToken(raw, TokenType.EMAIL_VERIFICATION),
    ).resolves.toBe('u1');
    await expect(
      service.consumeVerificationToken(raw, TokenType.EMAIL_VERIFICATION),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token used for the wrong purpose', async () => {
    const { service } = makeService();
    const raw = await service.createVerificationToken('u1', TokenType.EMAIL_VERIFICATION, 60_000);
    await expect(
      service.consumeVerificationToken(raw, TokenType.PASSWORD_RESET),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
