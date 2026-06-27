import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs one line per HTTP request with method, path, status code, and duration.
 * Error responses are still logged here (as the resolved status) and in detail
 * by the global HttpExceptionFilter.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const { method, originalUrl } = request;

    const log = (): void => {
      const ms = Date.now() - startedAt;
      this.logger.log(`${method} ${originalUrl} ${response.statusCode} ${ms}ms`);
    };

    return next.handle().pipe(
      tap({
        next: log,
        error: log,
      }),
    );
  }
}
