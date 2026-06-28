import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthResponse, MessageResponse, User as PublicUser } from '@rescuebite/types';
import { AppConfigService } from '../config/app-config.service';
import { AuthService, type SessionResult } from './auth.service';
import {
  AuthResponseDto,
  LoginDto,
  MessageResponseDto,
  RefreshDto,
  RegisterCustomerDto,
  RegisterMerchantDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UserDto,
  VerifyEmailDto,
} from './auth.dto';
import { CLIENT_TYPE_HEADER, REFRESH_COOKIE, type AuthenticatedUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

const STRICT = { default: { ttl: 60_000, limit: 10 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('register/customer')
  @ApiOkResponse({ schema: AuthResponseDto.openApiSchema })
  async registerCustomer(
    @Body() dto: RegisterCustomerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.registerCustomer(dto, req.headers['user-agent']);
    return this.respondWithSession(session, req, res);
  }

  @Public()
  @Throttle(STRICT)
  @Post('register/merchant')
  @ApiOkResponse({ schema: AuthResponseDto.openApiSchema })
  async registerMerchant(
    @Body() dto: RegisterMerchantDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.registerMerchant(dto, req.headers['user-agent']);
    return this.respondWithSession(session, req, res);
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOkResponse({ schema: AuthResponseDto.openApiSchema })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.login(dto, req.headers['user-agent']);
    return this.respondWithSession(session, req, res);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOkResponse({ schema: AuthResponseDto.openApiSchema })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.refresh(
      this.readRefreshToken(req, dto),
      req.headers['user-agent'],
    );
    return this.respondWithSession(session, req, res);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOkResponse({ schema: MessageResponseDto.openApiSchema })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.auth.logout(this.readRefreshToken(req, dto));
    this.clearRefreshCookie(res);
    return { message: 'Signed out.' };
  }

  @Get('me')
  @ApiOkResponse({ schema: UserDto.openApiSchema })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.auth.me(user.id);
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.OK)
  @Post('request-password-reset')
  @ApiOkResponse({ schema: MessageResponseDto.openApiSchema })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<MessageResponse> {
    await this.auth.requestPasswordReset(dto.email);
    return { message: 'If that email is registered, a reset link is on its way.' };
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOkResponse({ schema: MessageResponseDto.openApiSchema })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Your password has been reset. Please sign in.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOkResponse({ schema: MessageResponseDto.openApiSchema })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponse> {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Your email is verified.' };
  }

  // --- helpers -------------------------------------------------------------

  private readRefreshToken(req: Request, dto: RefreshDto): string | undefined {
    // express types `req.cookies` as `any`; narrow it explicitly.
    const cookies = (req.cookies ?? {}) as Record<string, unknown>;
    const rawCookie = cookies[REFRESH_COOKIE];
    const fromCookie = typeof rawCookie === 'string' ? rawCookie : undefined;
    const fromBody = typeof dto.refreshToken === 'string' ? dto.refreshToken : undefined;
    return fromCookie ?? fromBody;
  }

  private respondWithSession(session: SessionResult, req: Request, res: Response): AuthResponse {
    this.setRefreshCookie(res, session.refreshToken);
    // Mobile clients can't use httpOnly cookies, so hand them the token to store securely.
    if (req.headers[CLIENT_TYPE_HEADER] === 'mobile') {
      return { ...session.auth, refreshToken: session.refreshToken };
    }
    return session.auth;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
      ...(this.config.cookieDomain ? { domain: this.config.cookieDomain } : {}),
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      path: '/',
      ...(this.config.cookieDomain ? { domain: this.config.cookieDomain } : {}),
    });
  }
}
