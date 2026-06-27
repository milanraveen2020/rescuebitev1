import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError, ApiErrorCode, ApiErrorResponse } from '@rescuebite/types';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
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

const GENERIC_5XX = 'Something went wrong on our end. Please try again in a moment.';
/** Lowest 5xx status — at or above this, we mask the error message from clients. */
const SERVER_ERROR_MIN = 500;

/**
 * Converts every thrown error into the canonical envelope from @rescuebite/types:
 *   { error: { code, message, details? } }
 * with the matching HTTP status. Internals (stack traces, SQL, framework
 * messages) are logged server-side but never returned to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const { status, error } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${error.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = { error };
    response.status(status).json(body);
  }

  private normalize(exception: unknown): { status: HttpStatus; error: ApiError } {
    if (exception instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of exception.issues) {
        const key = issue.path.join('.') || '_';
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        status: HttpStatus.BAD_REQUEST,
        error: {
          code: 'validation_error',
          message: 'Some of the details you entered need a second look.',
          details: { fieldErrors },
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        error: {
          code: this.codeForStatus(status),
          message: this.safeHttpMessage(exception, status),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: 'internal_error', message: GENERIC_5XX },
    };
  }

  private fromPrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    error: ApiError;
  } {
    switch (exception.code) {
      case 'P2025': // record not found
        return {
          status: HttpStatus.NOT_FOUND,
          error: { code: 'not_found', message: 'That item could not be found.' },
        };
      case 'P2002': // unique constraint
        return {
          status: HttpStatus.CONFLICT,
          error: { code: 'conflict', message: 'That already exists.' },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: { code: 'internal_error', message: GENERIC_5XX },
        };
    }
  }

  private codeForStatus(status: number): ApiErrorCode {
    const match = (Object.entries(STATUS_BY_CODE) as [ApiErrorCode, number][]).find(
      ([, value]) => value === status,
    );
    return match?.[0] ?? 'internal_error';
  }

  /** Surface the framework message only for client (4xx) errors; mask 5xx detail. */
  private safeHttpMessage(exception: HttpException, status: number): string {
    if (status >= SERVER_ERROR_MIN) return GENERIC_5XX;
    const res = exception.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const message: unknown = res.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
    return exception.message;
  }
}
