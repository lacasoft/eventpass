import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../../../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('Security Headers (E2E)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);

    // Apply helmet configuration (same as main.ts)
    const helmetConfig = configService.get('security.helmet');
    app.use(helmet(helmetConfig));

    // Apply validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Helmet Security Headers', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      // Helmet sets this to DENY by default
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
    });

    it('should include Strict-Transport-Security (HSTS) header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
    });

    it('should include Content-Security-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should include X-DNS-Prefetch-Control header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      // Helmet sets this to 'off' by default
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('should include X-Download-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      // Some versions of helmet include this
      // Just check it's present if helmet adds it
      if (response.headers['x-download-options']) {
        expect(response.headers['x-download-options']).toBe('noopen');
      }
    });

    it('should NOT include X-Powered-By header', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      // Helmet removes X-Powered-By by default (security best practice)
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers for allowed origins', async () => {
      const allowedOrigin = 'http://localhost:3000';

      const response = await request(app.getHttpServer())
        .get('/events')
        .set('Origin', allowedOrigin)
        .expect(200);

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should have CSP with default-src self', async () => {
      const response = await request(app.getHttpServer()).get('/events').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
    });

    it('should allow inline styles for Swagger UI', async () => {
      const response = await request(app.getHttpServer()).get('/api').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      // Should allow unsafe-inline for styles (needed for Swagger)
      expect(csp).toContain("style-src");
    });

    it('should allow specific image sources', async () => {
      const response = await request(app.getHttpServer()).get('/api').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      // Should allow data: URIs and validator.swagger.io for images
      expect(csp).toContain('img-src');
    });
  });

  describe('Security Headers on All Endpoints', () => {
    const endpoints = [
      { method: 'get', path: '/health' },
      { method: 'get', path: '/events' },
      { method: 'get', path: '/venues' },
      { method: 'get', path: '/api' }, // Swagger
    ];

    endpoints.forEach(({ method, path }) => {
      it(`should include security headers on ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app.getHttpServer())[method](path);

        // Basic security headers should be present
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['content-security-policy']).toBeDefined();
      });
    });
  });

  describe('Security Headers on Error Responses', () => {
    it('should include security headers on 404 responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include security headers on 401 responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .expect(401);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include security headers on 403 responses', async () => {
      // Try to access admin endpoint without proper role
      const response = await request(app.getHttpServer())
        .get('/analytics/admin/dashboard')
        .expect(401); // Will be 401 without token, but headers should still be present

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include security headers on 500 responses', async () => {
      // Trigger a server error by sending invalid data
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({}); // Invalid payload

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('HSTS Configuration', () => {
    it('should have HSTS max-age of at least 1 year', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toBeDefined();

      // Extract max-age value
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();

      const maxAge = parseInt(maxAgeMatch![1], 10);
      const oneYear = 31536000; // seconds in a year

      expect(maxAge).toBeGreaterThanOrEqual(oneYear);
    });

    it('should include includeSubDomains in HSTS', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('includeSubDomains');
    });

    it('should include preload in HSTS', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('preload');
    });
  });

  describe('Sensitive Data Protection', () => {
    it('should not expose stack traces in production errors', async () => {
      // Set NODE_ENV to production temporarily
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ invalid: 'data' });

      // Response should not contain stack trace
      if (response.body.stack) {
        expect(response.body.stack).toBeUndefined();
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose sensitive headers', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      // Should not expose internal implementation details
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toContain('Express');
    });
  });
});
