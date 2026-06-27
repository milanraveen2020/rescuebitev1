import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { StoreStatus, TokenType, UserRole, UserStatus, type User } from '@prisma/client';
import type {
  AuthResponse,
  LoginInput,
  RegisterCustomerInput,
  RegisterMerchantInput,
  User as PublicUser,
} from '@rescuebite/types';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from './email.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** Result of any flow that establishes a session. */
export interface SessionResult {
  auth: AuthResponse;
  /** Raw refresh token — controller sets it as a cookie (web) and/or body (mobile). */
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
  ) {}

  async registerCustomer(input: RegisterCustomerInput, userAgent?: string): Promise<SessionResult> {
    await this.assertEmailAvailable(input.email);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await this.passwords.hash(input.password),
        name: input.name,
        phone: input.phone ?? null,
        role: UserRole.CUSTOMER,
      },
    });
    await this.sendVerification(user);
    return this.startSession(user, userAgent);
  }

  async registerMerchant(input: RegisterMerchantInput, userAgent?: string): Promise<SessionResult> {
    await this.assertEmailAvailable(input.email);
    const passwordHash = await this.passwords.hash(input.password);

    // User + their PENDING store are created atomically; an admin approves later.
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone ?? null,
          role: UserRole.MERCHANT_OWNER,
        },
      });
      await tx.store.create({
        data: {
          ownerId: created.id,
          name: input.store.name,
          category: input.store.category,
          description: input.store.description ?? null,
          address: input.store.address,
          lat: input.store.lat,
          lng: input.store.lng,
          status: StoreStatus.PENDING,
        },
      });
      return created;
    });

    await this.sendVerification(user);
    return this.startSession(user, userAgent);
  }

  async login(input: LoginInput, userAgent?: string): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      // Spend the same hashing cost as a real verify so timing doesn't reveal
      // whether the email exists.
      await this.passwords.hash(input.password);
      throw new UnauthorizedException('Incorrect email or password.');
    }
    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Incorrect email or password.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('This account has been suspended.');
    }
    return this.startSession(user, userAgent);
  }

  async refresh(rawToken: string | undefined, userAgent?: string): Promise<SessionResult> {
    if (!rawToken) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    const { userId, refreshToken } = await this.tokens.rotateRefreshToken(rawToken, userAgent);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your session is no longer valid.');
    }
    const { accessToken, expiresIn } = await this.tokens.signAccessToken(user);
    return {
      auth: { accessToken, expiresIn, user: toPublicUser(user) },
      refreshToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.tokens.revokeRefreshToken(rawToken);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Your session is no longer valid.');
    return toPublicUser(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always succeed silently — never reveal whether an email is registered.
    if (user) {
      const token = await this.tokens.createVerificationToken(
        user.id,
        TokenType.PASSWORD_RESET,
        PASSWORD_RESET_TTL_MS,
      );
      await this.email.sendPasswordReset(user.email, token);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const userId = await this.tokens.consumeVerificationToken(rawToken, TokenType.PASSWORD_RESET);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(newPassword) },
    });
    // Invalidate every existing session after a password change.
    await this.tokens.revokeAllForUser(userId);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const userId = await this.tokens.consumeVerificationToken(
      rawToken,
      TokenType.EMAIL_VERIFICATION,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }
  }

  private async sendVerification(user: User): Promise<void> {
    const token = await this.tokens.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL_MS,
    );
    await this.email.sendEmailVerification(user.email, token);
  }

  private async startSession(user: User, userAgent?: string): Promise<SessionResult> {
    const [{ accessToken, expiresIn }, refreshToken] = await Promise.all([
      this.tokens.signAccessToken(user),
      this.tokens.issueRefreshToken(user.id, userAgent),
    ]);
    return {
      auth: { accessToken, expiresIn, user: toPublicUser(user) },
      refreshToken,
    };
  }
}

/** Strip secrets and serialize dates to the public User shape. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
