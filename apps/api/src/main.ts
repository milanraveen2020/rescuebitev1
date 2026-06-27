import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.use(cookieParser());

  // CORS for the three frontends (customer / merchant / admin). In dev with no
  // configured origins, reflect the request origin to keep local setup painless.
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // OpenAPI docs at /docs, raw spec at /docs-json (consumed by the api-client generator).
  const openApiConfig = new DocumentBuilder()
    .setTitle('RescueBite API')
    .setDescription('Rescue surplus food — marketplace API.')
    .setVersion('0.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.port);
  new Logger('Bootstrap').log(`RescueBite API listening on http://localhost:${config.port}`);
  new Logger('Bootstrap').log(`API docs at http://localhost:${config.port}/docs`);
}

void bootstrap();
