import {
  AuthResponseSchema,
  LoginSchema,
  MessageResponseSchema,
  RefreshRequestSchema,
  RegisterCustomerSchema,
  RegisterMerchantSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  UserSchema,
  VerifyEmailSchema,
} from '@rescuebite/types';
import { createZodDto } from '../common/validation/zod-dto';

// Request bodies — validated by the global ZodValidationPipe.
export class RegisterCustomerDto extends createZodDto(RegisterCustomerSchema) {}
export class RegisterMerchantDto extends createZodDto(RegisterMerchantSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}
export class RefreshDto extends createZodDto(RefreshRequestSchema) {}
export class RequestPasswordResetDto extends createZodDto(RequestPasswordResetSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}

// Response shapes — used for Swagger documentation only.
export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}
export class MessageResponseDto extends createZodDto(MessageResponseSchema) {}
export class UserDto extends createZodDto(UserSchema) {}
