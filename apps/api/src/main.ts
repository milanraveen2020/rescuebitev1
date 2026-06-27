import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const origins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });

  // Global filter normalizes every error into the @rescuebite/types ApiError envelope.
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(`RescueBite API listening on http://localhost:${port}`);
}

void bootstrap();
