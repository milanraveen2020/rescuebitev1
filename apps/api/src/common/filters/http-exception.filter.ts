import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError, ApiErrorCode } from '@rescuebite/types';

const STATUS_BY_CODE: Record<ApiErrorCode, HttpStatus> = {
  validation_error: HttpStatus.BAD_REQUEST,
  unauthenticated: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
  sold_out: HttpStatus.CONFLICT,
  pickup_window_closed: HttpStatus.CONFLICT,
  payment_failed: HttpStatus.PAYMENT_REQUIRED,
  internal_error: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Converts every thrown error into the canonical ApiError envelope from
 * @rescuebite/types. Internals (stack traces, SQL, framework messages) are logged
 * server-side but never returned to the client — user-facing messages stay friendly.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toApiError(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json(body);
  }

  private toApiError(exception: unknown): { status: HttpStatus; body: ApiError } {
    if (exception instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of exception.issues) {
        const key = issue.path.join('.') || '_';
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: 'validation_error',
          message: 'Some of the details you entered need a second look.',
          fieldErrors,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          code: this.codeForStatus(status),
          message: this.safeMessage(exception, status),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'internal_error',
        message: 'Something went wrong on our end. Please try again in a moment.',
      },
    };
  }

  private codeForStatus(status: number): ApiErrorCode {
    const match = (Object.entries(STATUS_BY_CODE) as [ApiErrorCode, HttpStatus][]).find(
      ([, value]) => value === status,
    );
    return match?.[0] ?? 'internal_error';
  }

  /** Only surface the framework message for client (4xx) errors; mask 5xx details. */
  private safeMessage(exception: HttpException, status: number): string {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Something went wrong on our end. Please try again in a moment.';
    }
    const res = exception.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const message = (res as { message: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
    return exception.message;
  }
}
