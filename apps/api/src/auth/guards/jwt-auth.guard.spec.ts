import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TokenService } from '../token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface FakeRequest {
  headers: Record<string, string>;
  user?: unknown;
}

function contextFor(request: FakeRequest): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const claims = { sub: 'u1', email: 'a@b.test', role: 'CUSTOMER' as const, type: 'access' as const };

describe('JwtAuthGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('allows public routes without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(reflector, tokens);

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects a protected route with no bearer token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(reflector, tokens);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the principal for a valid token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const tokens = {
      verifyAccessToken: jest.fn().mockResolvedValue(claims),
    } as unknown as TokenService;
    const guard = new JwtAuthGuard(reflector, tokens);
    const request: FakeRequest = { headers: { authorization: 'Bearer good.token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'a@b.test', role: 'CUSTOMER' });
  });

  it('rejects a non-Bearer authorization header', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(reflector, tokens);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
