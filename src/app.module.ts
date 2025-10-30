import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';

// Configuraciones
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import securityConfig from './config/security.config';
import emailConfig from './config/email.config';
import jobsConfig from './config/jobs.config';
import cacheConfig from './common/cache/cache.config';
import { loggerConfig } from './config/logger.config';
import { validate } from './config/env.validation';

// Middlewares
import { ApiKeyMiddleware } from './common/middleware/api-key.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { CompressionMiddleware } from './common/middleware/compression.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

// Guards
import { RateLimitGuard } from './common/guards/rate-limit.guard';

// Módulos
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { EmailModule } from './common/email/email.module';
import { VenuesModule } from './modules/venues/venues.module';
import { EventsModule } from './modules/events/events.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, securityConfig, emailConfig, jobsConfig, cacheConfig],
      cache: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('database')!,
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('cache'),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig: any = {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        };

        // Agregar contraseña solo si está configurada
        const redisPassword = configService.get('REDIS_PASSWORD');
        if (redisPassword) {
          redisConfig.password = redisPassword;
        }

        return { redis: redisConfig };
      },
      inject: [ConfigService],
    }),
    WinstonModule.forRoot(loggerConfig),
    LoggerModule, // Módulo global de logging y security audit
    HealthModule,
    UsersModule,
    AuthModule,
    MetricsModule,
    EmailModule,
    VenuesModule,
    EventsModule,
    BookingsModule,
    PaymentsModule,
    AnalyticsModule,
    JobsModule, // Módulo de Jobs para gestionar tareas programadas
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Request logging middleware - Applied first to all routes
    consumer
      .apply(RequestLoggingMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/advanced', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
      )
      .forRoutes('*');

    // Security headers and compression
    consumer.apply(SecurityHeadersMiddleware, CompressionMiddleware).forRoutes('*');

    // API key validation
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/advanced', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: '', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
