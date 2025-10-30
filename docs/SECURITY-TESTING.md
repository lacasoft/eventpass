# Security Testing Guide - EventPass

## Índice

1. [Introducción](#introducción)
2. [OWASP Top 10 Coverage](#owasp-top-10-coverage)
3. [Authentication & Authorization Tests](#authentication--authorization-tests)
4. [Input Validation Tests](#input-validation-tests)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [XSS Prevention](#xss-prevention)
7. [CSRF Protection](#csrf-protection)
8. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
9. [Sensitive Data Exposure](#sensitive-data-exposure)
10. [Security Headers](#security-headers)
11. [Dependency Security](#dependency-security)
12. [Performance & Load Testing](#performance--load-testing)
13. [Automated Security Tools](#automated-security-tools)

---

## Introducción

Esta guía proporciona recomendaciones y estrategias para implementar pruebas de seguridad comprehensivas en EventPass, cubriendo OWASP Top 10 y mejores prácticas de seguridad en aplicaciones Node.js/NestJS.

---

## OWASP Top 10 Coverage

### A01:2021 - Broken Access Control

**Status**: ✅ Implementado con guards y decoradores

**Tests Recomendados**:

```typescript
// test/security/access-control.security.spec.ts
describe('Access Control Security Tests', () => {
  it('should prevent customer from accessing admin endpoints', async () => {
    await request(app.getHttpServer())
      .get('/analytics/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should prevent organizer from modifying other organizer events', async () => {
    await request(app.getHttpServer())
      .patch(`/events/${otherOrganizerEventId}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Hacked Event' })
      .expect(403);
  });

  it('should prevent horizontal privilege escalation (IDOR)', async () => {
    // User A trying to access User B's booking
    await request(app.getHttpServer())
      .get(`/bookings/${userBBookingId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403);
  });
});
```

**Implementación Actual**:
- ✅ `@Roles()` decorator para control basado en roles
- ✅ `RolesGuard` valida permisos
- ✅ Ownership validation en services (userId check)

---

### A02:2021 - Cryptographic Failures

**Status**: ✅ Implementado con bcrypt y JWT

**Tests Recomendados**:

```typescript
describe('Cryptographic Security Tests', () => {
  it('should hash passwords with bcrypt', async () => {
    const user = await usersRepository.findOne({ where: { email: 'test@test.com' } });
    expect(user.password).not.toBe('plain-password');
    expect(user.password.startsWith('$2b$')).toBe(true); // bcrypt hash
  });

  it('should never expose passwords in API responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('refreshToken');
  });

  it('should use secure JWT tokens', () => {
    const decoded = jwt.decode(token);
    expect(decoded).toHaveProperty('sub'); // user ID
    expect(decoded).toHaveProperty('email');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('exp'); // expiration
  });
});
```

**Implementación Actual**:
- ✅ Bcrypt para hashing de contraseñas
- ✅ JWT con expiración configurada
- ✅ Password strength validation
- ✅ ClassTransformOptions excluyendo passwords

---

### A03:2021 - Injection (SQL, NoSQL, Command)

**Status**: ✅ Protegido con TypeORM parametrized queries

**Tests Recomendados**:

```typescript
describe('SQL Injection Prevention Tests', () => {
  it('should prevent SQL injection in search queries', async () => {
    const maliciousPayload = "'; DROP TABLE users; --";

    const response = await request(app.getHttpServer())
      .get(`/events?search=${encodeURIComponent(maliciousPayload)}`)
      .expect(200);

    // Should return empty or normal results, not error
    expect(response.body.items).toBeDefined();

    // Verify table still exists
    const users = await usersRepository.count();
    expect(users).toBeGreaterThan(0);
  });

  it('should sanitize user inputs in event creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        venueId,
        title: '<script>alert("XSS")</script>',
        description: '"; DROP TABLE events; --',
        category: 'concert',
        eventDate: futureDate,
        ticketPrice: 50,
        totalTickets: 100,
      })
      .expect(201);

    // Should escape or sanitize malicious content
    expect(response.body.title).not.toContain('<script>');
  });
});
```

**Implementación Actual**:
- ✅ TypeORM parametrized queries
- ✅ Class-validator para input validation
- ✅ Sanitize-html en descripciones

---

### A04:2021 - Insecure Design

**Status**: ✅ Diseño con seguridad en mente

**Puntos Clave**:
- ✅ Principio de menor privilegio (roles: customer, organizer, admin)
- ✅ Defense in depth (guards + service validation)
- ✅ Fail securely (errores genéricos, no información sensible)
- ✅ Separation of concerns (modules independientes)

---

### A05:2021 - Security Misconfiguration

**Tests Recomendados**:

```typescript
describe('Security Configuration Tests', () => {
  it('should have secure HTTP headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined(); // Hide Express
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('should not expose stack traces in production', async () => {
    const response = await request(app.getHttpServer())
      .get('/non-existent-endpoint')
      .expect(404);

    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('trace');
  });

  it('should enforce HTTPS in production', () => {
    if (process.env.NODE_ENV === 'production') {
      expect(process.env.FORCE_HTTPS).toBe('true');
    }
  });
});
```

**Implementación Recomendada**:
```bash
npm install helmet compression
```

```typescript
// main.ts
import helmet from 'helmet';
import compression from 'compression';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(compression());
```

---

### A06:2021 - Vulnerable and Outdated Components

**Tests Automáticos**:

```bash
# Audit de dependencias
npm audit

# Fix automático de vulnerabilidades
npm audit fix

# Verificar dependencias desactualizadas
npx npm-check-updates

# Snyk scan (recomendado)
npx snyk test
npx snyk monitor
```

**GitHub Actions CI/CD**:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### A07:2021 - Identification and Authentication Failures

**Tests Recomendados**:

```typescript
describe('Authentication Security Tests', () => {
  it('should enforce strong password policy', async () => {
    const weakPasswords = ['123456', 'password', 'qwerty', 'abc123'];

    for (const weakPassword of weakPasswords) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: weakPassword,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    }
  });

  it('should implement rate limiting on login endpoint', async () => {
    const attempts = [];

    for (let i = 0; i < 15; i++) {
      attempts.push(
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong-password',
          })
      );
    }

    const responses = await Promise.all(attempts);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should expire JWT tokens after configured time', async () => {
    // Mock time 2 hours ahead
    jest.useFakeTimers();
    jest.advanceTimersByTime(2 * 60 * 60 * 1000);

    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    jest.useRealTimers();
  });

  it('should not reveal user existence on login failure', async () => {
    const nonExistentResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password' })
      .expect(404);

    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'existing@test.com', password: 'wrongpassword' })
      .expect(401);

    // Both should return generic errors
    expect(nonExistentResponse.body.message).not.toContain('does not exist');
    expect(wrongPasswordResponse.body.message).not.toContain('password');
  });
});
```

**Implementación Recomendada**:

```typescript
// src/modules/auth/auth.controller.ts
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 intentos por minuto
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

---

### A08:2021 - Software and Data Integrity Failures

**Tests Recomendados**:

```typescript
describe('Data Integrity Tests', () => {
  it('should validate Stripe webhook signatures', async () => {
    const invalidSignature = 'invalid-signature';
    const validPayload = JSON.stringify({ type: 'payment_intent.succeeded' });

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('stripe-signature', invalidSignature)
      .send(validPayload)
      .expect(400);
  });

  it('should prevent amount tampering in payment flow', async () => {
    // Crear booking con precio 100
    const booking = await createBooking({ quantity: 2, unitPrice: 50 });

    // Intentar pagar con monto diferente
    const tampered Intent = {
      bookingId: booking.id,
      amount: 50, // Intentando pagar menos
    };

    await request(app.getHttpServer())
      .post('/payments/create-intent')
      .set('Authorization', `Bearer ${token}`)
      .send(tamperedIntent)
      .expect(400); // Should reject
  });

  it('should implement webhook idempotency', async () => {
    const eventId = 'evt_test_123';
    const webhook = createMockWebhook(eventId);

    // Enviar el mismo webhook 3 veces
    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('stripe-signature', validSignature)
      .send(webhook);

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('stripe-signature', validSignature)
      .send(webhook);

    await request(app.getHttpServer())
      .post('/payments/webhook')
      .set('stripe-signature', validSignature)
      .send(webhook);

    // Verificar que solo se procesó una vez
    const payments = await paymentsRepository.find({ where: { stripeEventId: eventId } });
    expect(payments).toHaveLength(1);
  });
});
```

---

### A09:2021 - Security Logging and Monitoring Failures

**Implementación Recomendada**:

```typescript
// src/common/interceptors/logging.interceptor.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SecurityLoggingInterceptor {
  private readonly logger = new Logger('SecurityAudit');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body } = request;

    // Log security-relevant events
    if (this.isSecurityRelevant(method, url)) {
      this.logger.log({
        event: 'security_action',
        userId: user?.id,
        userRole: user?.role,
        method,
        url,
        timestamp: new Date().toISOString(),
        ip: request.ip,
      });
    }

    return next.handle();
  }

  private isSecurityRelevant(method: string, url: string): boolean {
    return (
      url.includes('/auth/') ||
      url.includes('/payments/') ||
      url.includes('/admin/') ||
      method === 'DELETE'
    );
  }
}
```

**Eventos a Monitorear**:
- ✅ Login attempts (exitosos y fallidos)
- ✅ Password changes
- ✅ Role escalation attempts
- ✅ Payment transactions
- ✅ Data modifications (DELETE, UPDATE)
- ✅ Admin actions
- ✅ Failed authorization attempts

---

### A10:2021 - Server-Side Request Forgery (SSRF)

**Tests Recomendados**:

```typescript
describe('SSRF Prevention Tests', () => {
  it('should validate image URLs in event creation', async () => {
    const ssrfUrls = [
      'http://localhost/admin',
      'http://127.0.0.1:6379/', // Redis
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'file:///etc/passwd',
    ];

    for (const maliciousUrl of ssrfUrls) {
      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venueId,
          title: 'Event',
          imageUrl: maliciousUrl,
          // ... otros campos
        })
        .expect(400);
    }
  });

  it('should only allow HTTPS URLs for images', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        venueId,
        title: 'Event',
        imageUrl: 'http://example.com/image.jpg', // HTTP, not HTTPS
        // ... otros campos
      })
      .expect(400);
  });
});
```

---

## Rate Limiting & DDoS Protection

**Implementación con @nestjs/throttler**:

```bash
npm install --save @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per minute
    }),
  ],
})
export class AppModule {}
```

**Tests**:

```typescript
describe('Rate Limiting Tests', () => {
  it('should rate limit API requests', async () => {
    const requests = [];

    for (let i = 0; i < 150; i++) {
      requests.push(
        request(app.getHttpServer())
          .get('/events')
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

---

## Performance & Load Testing

**Status**: ✅ **Implementado** - Ver documentación completa en [PERFORMANCE-TESTING.md](PERFORMANCE-TESTING.md)

### Quick Start

EventPass incluye dos configuraciones de performance testing con Artillery:

```bash
# Smoke test rápido (2 minutos)
npm run perf:smoke

# Load test completo (12 minutos)
npm run perf:test

# Generar reporte HTML
npm run perf:report
```

### Configuraciones Disponibles

1. **[artillery-smoke.yml](../artillery-smoke.yml)** - Smoke test
   - Duración: 2 minutos
   - Carga: 5 usuarios/segundo
   - Escenarios: Health check, Browse events, User login
   - Threshold: P95 < 3000ms, Error rate < 5%

2. **[artillery.yml](../artillery.yml)** - Load test completo
   - Duración: 12 minutos
   - Fases: Warm-up → Ramp-up → Sustained (30/sec) → Spike (100/sec) → Cool-down
   - Escenarios: Public browsing (40%), Registration (20%), Booking flow (30%), Analytics (10%)
   - Threshold: P95 < 2000ms, P99 < 5000ms, Error rate < 1%

### Documentación Completa

Para información detallada sobre:
- Configuración de escenarios
- Interpretación de métricas (P95, P99, error rate)
- Troubleshooting de problemas comunes
- Integración con CI/CD
- Best practices

Consultar: **[PERFORMANCE-TESTING.md](PERFORMANCE-TESTING.md)**

---

## Automated Security Tools

### 1. **SonarQube** (Code Quality & Security)

```bash
npm install --save-dev sonarqube-scanner
```

```javascript
// sonar-project.js
const sonarqubeScanner = require('sonarqube-scanner');

sonarqubeScanner({
  serverUrl: 'http://localhost:9000',
  options: {
    'sonar.projectKey': 'eventpass',
    'sonar.sources': 'src',
    'sonar.tests': 'test',
    'sonar.typescript.lcov.reportPaths': 'coverage/lcov.info',
  },
}, () => {});
```

### 2. **OWASP Dependency-Check**

```bash
npm install --save-dev owasp-dependency-check
```

### 3. **ESLint Security Plugin**

```bash
npm install --save-dev eslint-plugin-security
```

```javascript
// eslint.config.mjs
import security from 'eslint-plugin-security';

export default [
  {
    plugins: {
      security,
    },
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
    },
  },
];
```

---

## Summary Checklist

### Implementado ✅
- [x] Authentication (JWT + bcrypt)
- [x] Authorization (Roles + Guards)
- [x] Input validation (class-validator)
- [x] SQL injection prevention (TypeORM)
- [x] Password strength validation
- [x] CORS configuration
- [x] Error handling (sin stack traces en prod)
- [x] Data sanitization (sanitize-html)
- [x] **Rate limiting (@nestjs/throttler)** ✅
  - Global: 100 requests/minuto
  - Login: 5 intentos/minuto (configurable vía env)
  - Forgot password: 3 intentos/minuto
  - Custom guard con IP tracking y headers informativos
  - Ver: [rate-limit.guard.ts](../src/common/guards/rate-limit.guard.ts)
- [x] **Security headers (helmet)** ✅
  - Content Security Policy (CSP) configurado
  - HTTP Strict Transport Security (HSTS): 1 año, includeSubDomains, preload
  - Aplicado globalmente en [main.ts](../src/main.ts)
  - Configuración: [security.config.ts](../src/config/security.config.ts)

### Recomendado para Implementar 🔄
- [ ] CSRF protection (tokens para formularios)
- [x] Request logging (Winston + security audit) - ✅ Implementado (ver [LOGGING.md](LOGGING.md))
- [ ] Automated dependency scanning (Snyk en CI/CD)
- [x] Load testing (Artillery) - ✅ Implementado (ver [PERFORMANCE-TESTING.md](PERFORMANCE-TESTING.md))
- [x] Rate limiting E2E tests - ✅ Implementado (14 tests en test/e2e/security/rate-limiting.e2e-spec.ts)
- [x] Security headers E2E tests - ✅ Implementado (25+ tests en test/e2e/security/security-headers.e2e-spec.ts)
- [ ] Penetration testing automation (OWASP ZAP)

### Monitoreo Continuo 📊
- [ ] Setup Sentry/LogRocket para error tracking
- [ ] Configure alertas para intentos de breach
- [ ] Implementar dashboard de seguridad
- [ ] Auditorías trimestrales de seguridad
- [ ] Penetration testing anual

---

## Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Snyk Security](https://snyk.io/)
- [Artillery Load Testing](https://www.artillery.io/)

---

**Última actualización**: 2025-10-30
**Autor**: EventPass Security Team
