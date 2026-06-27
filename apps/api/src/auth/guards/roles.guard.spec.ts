import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@rescuebite/types';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from '../auth.types';

function contextWithUser(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const customer: AuthenticatedUser = { id: 'u1', email: 'c@t.test', role: 'CUSTOMER' };

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows routes with no @Roles() metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser(customer))).toBe(true);
  });

  it('allows a user whose role is permitted', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'CUSTOMER'] as UserRole[]);
    expect(guard.canActivate(contextWithUser(customer))).toBe(true);
  });

  it('forbids a user whose role is not permitted', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as UserRole[]);
    expect(() => guard.canActivate(contextWithUser(customer))).toThrow(ForbiddenException);
  });

  it('forbids when there is no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as UserRole[]);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
