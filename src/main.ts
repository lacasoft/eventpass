import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { log } from 'console';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Habilitar raw body para Stripe webhooks
  });
  const configService = app.get(ConfigService);

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security - CORS with configuration
  const corsConfig = configService.get('security.cors');
  app.enableCors(corsConfig);

  // Security - Helmet with configuration
  const helmetConfig = configService.get('security.helmet');
  app.use(helmet(helmetConfig));

  // Validation & Sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new SanitizePipe(), // Sanitizar después de validar
  );

  // Serialization
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('eventpass API')
    .setDescription('Plataforma de Venta de Boletos')
    .setVersion('1.0.0')
    .setContact('LACA-SOFT', '', '')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addApiKey({ type: 'apiKey', name: 'x-api-secret', in: 'header' }, 'api-secret')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('app.port');
  await app.listen(port).then(() => {
    log(`
    ============================================
    =  NAME: ${configService.get('app.name') || 'DefaultAppName'}
    =  HTTP PORT: ${port}
    =  SWAGGER: http://localhost:${port}/api
    ============================================
     `);
  });
}

bootstrap().catch((err) => {
  console.error('Error during application bootstrap', err);
});
