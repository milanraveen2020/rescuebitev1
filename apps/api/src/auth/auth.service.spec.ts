import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

const SUFFIX = randomBytes(4).toString('hex');
const EMAIL = `auth-int-${SUFFIX}@test.local`;
const PASSWORD = 'Password123!';

describe('AuthService (integration)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, EmailModule, AuthModule],
    }).compile();
    service = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: EMAIL } });
  }, 30_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await moduleRef.close();
  });

  it('registers a customer and starts a session', async () => {
    const result = await service.registerCustomer({
      email: EMAIL,
      password: PASSWORD,
      name: 'Tester',
    });
    expect(result.auth.accessToken).toBeTruthy();
    expect(result.auth.user.role).toBe('CUSTOMER');
    expect(result.refreshToken).toBeTruthy();
    const stored = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(stored?.passwordHash).not.toBe(PASSWORD); // hashed, never stored in clear
  });

  it('rejects a duplicate email', async () => {
    await expect(
      service.registerCustomer({ email: EMAIL, password: PASSWORD, name: 'Dup' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with correct credentials', async () => {
    const result = await service.login({ email: EMAIL, password: PASSWORD });
    expect(result.auth.user.email).toBe(EMAIL);
  });

  it('rejects a wrong password', async () => {
    await expect(
      service.login({ email: EMAIL, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email without revealing it exists', async () => {
    await expect(
      service.login({ email: `nobody-${SUFFIX}@test.local`, password: PASSWORD }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('never throws on password-reset for an unknown email (no account enumeration)', async () => {
    await expect(
      service.requestPasswordReset(`ghost-${SUFFIX}@test.local`),
    ).resolves.toBeUndefined();
  });
});
