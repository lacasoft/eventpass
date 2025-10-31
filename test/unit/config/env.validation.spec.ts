import 'reflect-metadata';
import { validate, Environment, DatabaseType, StripeCurrency } from '../../../src/config/env.validation';

describe('Environment Validation', () => {
  const validEnvConfig = {
    NODE_ENV: 'development',
    APP_NAME: 'test-app',
    PORT: '3000',
    API_KEY: 'test-api-key',
    API_SECRET: 'test-api-secret',
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRES_IN: '1d',
    DB_TYPE: 'postgres',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'password',
    DB_NAME: 'test_db',
    DB_SSL: 'false',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CACHE_TTL: '300',
    CACHE_MAX_ITEMS: '100',
    CLUSTER_WORKERS: 'auto',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
    REDIS_DB: '0',
    CACHE_ENABLED: 'true',
    DB_POOL_SIZE: '10',
    DB_IDLE_TIMEOUT: '30000',
    DB_CONNECTION_TIMEOUT: '10000',
    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '100',
    THROTTLE_LOGIN_LIMIT: '5',
    THROTTLE_FORGOT_PASSWORD_LIMIT: '3',
    THROTTLE_TICKET_SCAN_LIMIT: '10',
    SUPER_ADMIN_EMAIL: 'admin@test.com',
    SUPER_ADMIN_PASSWORD: 'TestPassword123!',
    SUPER_ADMIN_FIRST_NAME: 'Admin',
    SUPER_ADMIN_LAST_NAME: 'User',
    EMAIL_SMTP_HOST: 'smtp.test.com',
    EMAIL_SMTP_PORT: '587',
    EMAIL_SMTP_SECURE: 'false',
    EMAIL_SMTP_USER: 'test@test.com',
    EMAIL_SMTP_PASS: 'test-password',
    EMAIL_FROM_NAME: 'Test App',
    EMAIL_FROM_ADDRESS: 'noreply@test.com',
    FRONTEND_URL: 'http://localhost:3001',
    SWAGGER_TITLE: 'Test API',
    SWAGGER_DESCRIPTION: 'Test Description',
    SWAGGER_VERSION: '1.0.0',
    STRIPE_SECRET_KEY: 'sk_test_123456',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_123456',
    STRIPE_WEBHOOK_SECRET: 'whsec_123456',
    STRIPE_CURRENCY: 'usd',
  };

  describe('validate', () => {
    it('should validate correct environment variables', () => {
      expect(() => validate(validEnvConfig)).not.toThrow();
    });

    it('should return transformed config with correct types', () => {
      const result = validate(validEnvConfig);

      expect(result.NODE_ENV).toBe(Environment.Development);
      expect(result.PORT).toBe(3000);
      expect(result.DB_PORT).toBe(5432);
      // DB_SSL, CACHE_ENABLED, EMAIL_SMTP_SECURE permanecen como strings
      // Esto evita el problema de class-transformer convirtiendo 'false' a true
      expect(result.DB_SSL).toBe('false');
      expect(result.CACHE_ENABLED).toBe('true');
      expect(result.DB_TYPE).toBe(DatabaseType.Postgres);
      expect(result.STRIPE_CURRENCY).toBe(StripeCurrency.USD);
    });

    it('should throw error if NODE_ENV is invalid', () => {
      const invalidConfig = { ...validEnvConfig, NODE_ENV: 'invalid' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if PORT is missing', () => {
      const invalidConfig: any = { ...validEnvConfig };
      delete invalidConfig.PORT;

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if PORT is out of range', () => {
      const invalidConfig = { ...validEnvConfig, PORT: '70000' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if DB_TYPE is invalid', () => {
      const invalidConfig = { ...validEnvConfig, DB_TYPE: 'invalid-db' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if SUPER_ADMIN_EMAIL is not a valid email', () => {
      const invalidConfig = { ...validEnvConfig, SUPER_ADMIN_EMAIL: 'not-an-email' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if REDIS_DB is out of range (0-15)', () => {
      const invalidConfig = { ...validEnvConfig, REDIS_DB: '16' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if FRONTEND_URL is not a valid URL', () => {
      const invalidConfig = { ...validEnvConfig, FRONTEND_URL: 'invalid url with spaces' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should throw error if STRIPE_CURRENCY is invalid', () => {
      const invalidConfig = { ...validEnvConfig, STRIPE_CURRENCY: 'invalid-currency' };

      expect(() => validate(invalidConfig)).toThrow('Environment variables validation failed');
    });

    it('should allow optional email fields to be missing', () => {
      const configWithoutEmail: any = { ...validEnvConfig };
      delete configWithoutEmail.EMAIL_SMTP_HOST;
      delete configWithoutEmail.EMAIL_SMTP_PORT;
      delete configWithoutEmail.EMAIL_SMTP_SECURE;
      delete configWithoutEmail.EMAIL_SMTP_USER;
      delete configWithoutEmail.EMAIL_SMTP_PASS;
      delete configWithoutEmail.EMAIL_FROM_NAME;
      delete configWithoutEmail.EMAIL_FROM_ADDRESS;

      expect(() => validate(configWithoutEmail)).not.toThrow();
    });

    it('should keep boolean-like values as strings', () => {
      const result = validate(validEnvConfig);

      // Estas variables permanecen como strings para evitar conversión incorrecta
      // 'false' string se convertía erróneamente a true boolean con @Type(() => Boolean)
      expect(typeof result.DB_SSL).toBe('string');
      expect(typeof result.CACHE_ENABLED).toBe('string');
      expect(typeof result.EMAIL_SMTP_SECURE).toBe('string');
      expect(result.DB_SSL).toBe('false');
      expect(result.CACHE_ENABLED).toBe('true');
    });

    it('should convert string numbers to actual numbers', () => {
      const result = validate(validEnvConfig);

      expect(typeof result.PORT).toBe('number');
      expect(typeof result.DB_PORT).toBe('number');
      expect(typeof result.CACHE_TTL).toBe('number');
      expect(typeof result.THROTTLE_LIMIT).toBe('number');
    });

    it('should throw descriptive error message with property name', () => {
      const invalidConfig: any = { ...validEnvConfig };
      delete invalidConfig.JWT_SECRET;

      try {
        validate(invalidConfig);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('JWT_SECRET');
        expect(error.message).toContain('Environment variables validation failed');
        expect(error.message).toContain('.env.example');
      }
    });

    it('should validate all environment types', () => {
      const envTypes = ['development', 'production', 'test', 'staging'];

      envTypes.forEach((env) => {
        const config = { ...validEnvConfig, NODE_ENV: env };
        expect(() => validate(config)).not.toThrow();
      });
    });

    it('should validate all database types', () => {
      const dbTypes = ['postgres', 'mysql', 'mariadb', 'sqlite', 'mssql', 'oracle', 'cockroachdb'];

      dbTypes.forEach((dbType) => {
        const config = { ...validEnvConfig, DB_TYPE: dbType };
        expect(() => validate(config)).not.toThrow();
      });
    });

    it('should validate all stripe currencies', () => {
      const currencies = ['usd', 'eur', 'gbp', 'mxn', 'ars', 'clp', 'cop', 'pen'];

      currencies.forEach((currency) => {
        const config = { ...validEnvConfig, STRIPE_CURRENCY: currency };
        expect(() => validate(config)).not.toThrow();
      });
    });
  });
});
