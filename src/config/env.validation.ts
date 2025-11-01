import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  validateSync,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { plainToClass, Type } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum DatabaseType {
  Postgres = 'postgres',
  MySQL = 'mysql',
  MariaDB = 'mariadb',
  SQLite = 'sqlite',
  MSSQL = 'mssql',
  Oracle = 'oracle',
  CockroachDB = 'cockroachdb',
}

export enum StripeCurrency {
  USD = 'usd',
  EUR = 'eur',
  GBP = 'gbp',
  MXN = 'mxn',
  ARS = 'ars',
  CLP = 'clp',
  COP = 'cop',
  PEN = 'pen',
}

export class EnvironmentVariables {
  // App
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  APP_NAME: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  API_KEY: string;

  @IsString()
  API_SECRET: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  // Database
  @IsEnum(DatabaseType)
  DB_TYPE: DatabaseType;

  @IsString()
  DB_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_SSL: string;

  // Security
  @IsString()
  ALLOWED_ORIGINS: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  // Performance
  @Type(() => Number)
  @IsInt()
  @Min(0)
  CACHE_TTL: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  CACHE_MAX_ITEMS: number;

  @IsString()
  CLUSTER_WORKERS: string;

  // Redis Cache
  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  REDIS_DB: number;

  @IsString()
  CACHE_ENABLED: string;

  // Database Pool
  @Type(() => Number)
  @IsInt()
  @Min(1)
  DB_POOL_SIZE: number;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  DB_IDLE_TIMEOUT: number;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  DB_CONNECTION_TIMEOUT: number;

  // Rate Limiting
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LOGIN_LIMIT: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_FORGOT_PASSWORD_LIMIT: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TICKET_SCAN_LIMIT: number;

  // Super Admin User
  @IsEmail()
  SUPER_ADMIN_EMAIL: string;

  @IsString()
  SUPER_ADMIN_PASSWORD: string;

  @IsString()
  SUPER_ADMIN_FIRST_NAME: string;

  @IsString()
  SUPER_ADMIN_LAST_NAME: string;

  // Email Configuration (SMTP)
  @IsString()
  @IsOptional()
  EMAIL_SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  EMAIL_SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  EMAIL_SMTP_SECURE?: string;

  @IsEmail()
  @IsOptional()
  EMAIL_SMTP_USER?: string;

  @IsString()
  @IsOptional()
  EMAIL_SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM_NAME?: string;

  @IsEmail()
  @IsOptional()
  EMAIL_FROM_ADDRESS?: string;

  @IsString()
  @IsOptional()
  EMAIL_APP_NAME?: string;

  @IsEmail()
  @IsOptional()
  EMAIL_SUPPORT_EMAIL?: string;

  // Frontend URL
  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  // Swagger
  @IsString()
  SWAGGER_TITLE: string;

  @IsString()
  SWAGGER_DESCRIPTION: string;

  @IsString()
  SWAGGER_VERSION: string;

  // Stripe Payment Integration
  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  STRIPE_PUBLISHABLE_KEY: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET: string;

  @IsEnum(StripeCurrency)
  STRIPE_CURRENCY: StripeCurrency;

  // Jobs Configuration
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  BOOKING_EXPIRATION_TIME?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  CLEANUP_EXPIRED_BOOKINGS_INTERVAL?: number;

  @IsString()
  @IsOptional()
  COMPLETE_PAST_EVENTS_TIME?: string;

  // Logging Configuration
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;
}

/**
 * Valida las variables de entorno contra el esquema definido
 * @param config - Objeto con las variables de entorno
 * @returns Las variables validadas y transformadas
 * @throws Error si la validación falla
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false, // Permitir variables adicionales no definidas
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = error.constraints
        ? Object.values(error.constraints).join(', ')
        : 'Unknown error';
      return `  - ${error.property}: ${constraints}`;
    });

    throw new Error(
      `❌ Environment variables validation failed:\n\n${errorMessages.join('\n')}\n\n` +
        `Please check your .env file and ensure all required variables are properly set.\n` +
        `Refer to .env.example for reference.`,
    );
  }

  return validatedConfig;
}
