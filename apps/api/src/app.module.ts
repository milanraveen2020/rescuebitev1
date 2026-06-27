import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { ZodValidationPipe } from './common/validation/zod-validation.pipe';
import { HealthModule } from './health/health.module';

/**
 * Root module. Registers the cross-cutting rails as global providers (so they
 * participate in DI), then mounts feature modules. Business feature modules
 * (auth, stores, listings, orders, …) are added to `imports` as they are built.
 */
@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
