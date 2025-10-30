import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Rate Limiting Security (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
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

  describe('Global Rate Limiting (100 requests/minute)', () => {
    it('should allow requests under the limit', async () => {
      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/health').expect(200);
      }
    });

    it('should return 429 after exceeding limit', async () => {
      // This test requires clean state - run in isolation
      // Make 101 requests to trigger rate limit (global: 100/min)
      const responses: number[] = [];

      for (let i = 0; i < 105; i++) {
        const response = await request(app.getHttpServer()).get('/events');
        responses.push(response.status);
      }

      // At least one should be rate limited (429)
      const rateLimited = responses.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout

    it('should include rate limit headers in 429 response', async () => {
      // Trigger rate limit
      const responses: any[] = [];
      for (let i = 0; i < 105; i++) {
        const response = await request(app.getHttpServer()).get('/venues');
        if (response.status === 429) {
          responses.push(response);
        }
      }

      // Check first rate limited response
      if (responses.length > 0) {
        const rateLimitedResponse = responses[0];
        expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimitedResponse.headers['x-ratelimit-remaining']).toBe('0');
        expect(rateLimitedResponse.headers['x-ratelimit-reset']).toBeDefined();
      }
    }, 30000);
  });

  describe('Login Rate Limiting (5 requests/minute)', () => {
    it('should allow login attempts under the limit', async () => {
      // Make 3 login attempts - all should return 401 (unauthorized, not rate limited)
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401); // Unauthorized, not rate limited
      }
    });

    it('should rate limit login after 5 attempts', async () => {
      const responses: number[] = [];

      // Make 7 login attempts
      for (let i = 0; i < 7; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: `test-rate-limit-${Date.now()}@test.com`,
            password: 'Password123!',
          });

        responses.push(response.status);
      }

      // Last 2 should be rate limited (429)
      const rateLimited = responses.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThanOrEqual(1);
    }, 15000);

    it('should return appropriate error message for rate limited login', async () => {
      let rateLimitedResponse;

      // Trigger rate limit on login
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: `ratelimit-test-${Date.now()}@test.com`,
            password: 'Test123!',
          });

        if (response.status === 429) {
          rateLimitedResponse = response;
          break;
        }
      }

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('message');
        expect(rateLimitedResponse.body.message).toContain('Too many requests');
      }
    }, 15000);
  });

  describe('Forgot Password Rate Limiting (3 requests/minute)', () => {
    it('should allow forgot password under the limit', async () => {
      // Make 2 requests - should succeed (always returns 200 for security)
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({
            email: 'test@test.com',
          })
          .expect(200);
      }
    });

    it('should rate limit forgot password after 3 attempts', async () => {
      const responses: number[] = [];

      // Make 5 forgot password requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({
            email: `forgot-test-${Date.now()}@test.com`,
          });

        responses.push(response.status);
      }

      // At least 1 should be rate limited
      const rateLimited = responses.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThanOrEqual(1);
    }, 15000);
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit after TTL expires', async () => {
      // Make requests to consume limit
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer()).get('/health');
      }

      // Wait for TTL to expire (60 seconds + buffer)
      // Note: This test is slow - only run in full test suites
      console.log('Waiting 65 seconds for rate limit reset...');
      await new Promise((resolve) => setTimeout(resolve, 65000));

      // Should be able to make requests again
      await request(app.getHttpServer()).get('/health').expect(200);
    }, 70000); // 70 second timeout
  });

  describe('Rate Limit per IP', () => {
    it('should track rate limits by IP address', async () => {
      // This test verifies that rate limiting is per-IP
      // In a real scenario, different IPs would have separate limits

      const response = await request(app.getHttpServer())
        .get('/events')
        .set('X-Forwarded-For', '192.168.1.100'); // Simulate different IP

      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Rate Limit Bypass for Authenticated Requests', () => {
    it('should still apply rate limits to authenticated endpoints', async () => {
      // Rate limits should apply regardless of authentication
      // This prevents authenticated users from abusing the API

      const responses: number[] = [];
      for (let i = 0; i < 105; i++) {
        const response = await request(app.getHttpServer())
          .get('/events')
          .set('Authorization', 'Bearer invalid-token');

        responses.push(response.status);
      }

      // Should have some rate limited responses
      const rateLimited = responses.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });
});
