# Logging & Security Audit - EventPass

**Fecha**: 30 de Octubre de 2025
**Estado**: ✅ **Implementado**

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura de Logging](#arquitectura-de-logging)
3. [Configuración](#configuración)
4. [Tipos de Logs](#tipos-de-logs)
5. [Request Logging](#request-logging)
6. [Security Audit](#security-audit)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Análisis de Logs](#análisis-de-logs)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

EventPass implementa un sistema completo de logging con **Winston** que incluye:

- **Request/Response Logging**: Todos los requests HTTP con metadatos completos
- **Security Audit**: Eventos de seguridad (autenticación, autorización, pagos)
- **Error Tracking**: Logs estructurados de errores con stack traces
- **Performance Monitoring**: Tiempos de respuesta de cada request
- **Correlation IDs**: Trazabilidad completa de requests a través del sistema

### ✅ Beneficios

- **Compliance**: Cumple con requisitos de auditoría OWASP
- **Debugging**: Facilita la identificación de problemas en producción
- **Security**: Detecta intentos de ataque y violaciones de seguridad
- **Performance**: Identifica endpoints lentos y cuellos de botella
- **Trazabilidad**: Seguimiento completo del flujo de requests

---

## 🏗️ Arquitectura de Logging

### Componentes

```
┌─────────────────────────────────────────────────┐
│           Request HTTP                          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│   RequestLoggingMiddleware                      │
│   - Captura request/response                    │
│   - Genera correlationId                        │
│   - Mide tiempo de respuesta                    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│   Winston Logger                                │
│   - Console transport (desarrollo)              │
│   - File transports (producción)                │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────┐    ┌──────────────────┐
│ Logs Files   │    │ Security Audit   │
│ - error.log  │    │ Service          │
│ - combined   │    │ - Login events   │
│ - requests   │    │ - Payment events │
└──────────────┘    │ - Access control │
                    └──────────────────┘
```

### Archivos de Logs

| Archivo | Propósito | Nivel | Retención |
|---------|-----------|-------|-----------|
| `logs/error.log` | Solo errores con stack traces | error | 5 archivos x 10MB |
| `logs/combined.log` | Todos los eventos de la aplicación | info+ | 10 archivos x 10MB |
| `logs/security-audit.log` | Eventos de seguridad críticos | info+ | 30 archivos x 10MB |
| `logs/requests.log` | HTTP request/response tracking | http | 7 archivos x 10MB |
| `logs/exceptions.log` | Uncaught exceptions | error | Sin límite |
| `logs/rejections.log` | Unhandled promise rejections | error | Sin límite |

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Logging Configuration
LOG_LEVEL=info  # error, warn, info, http, verbose, debug, silly
```

**Niveles recomendados por ambiente:**

- **Desarrollo**: `debug` o `http` (máxima visibilidad)
- **Staging**: `info` (balance entre información y ruido)
- **Producción**: `warn` o `info` (solo información importante)

### Winston Configuration

Archivo: `src/config/logger.config.ts`

```typescript
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console (desarrollo)
    new winston.transports.Console({ ... }),

    // Files (producción)
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/security-audit.log' }),
    new winston.transports.File({ filename: 'logs/requests.log', level: 'http' }),
  ],
  exceptionHandlers: [...],
  rejectionHandlers: [...],
};
```

---

## 📝 Tipos de Logs

### 1. Request Logs (HTTP)

**Nivel**: `http`
**Archivo**: `logs/requests.log`

```json
{
  "timestamp": "2025-10-30T10:30:45.123Z",
  "level": "http",
  "message": "Incoming request",
  "method": "POST",
  "url": "/api/auth/login",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "referer": "http://localhost:3001",
  "correlationId": "1730284245123-abc123xyz"
}
```

### 2. Security Audit Logs

**Nivel**: `info`, `warn`, `error` (según severidad)
**Archivo**: `logs/security-audit.log`

```json
{
  "timestamp": "2025-10-30T10:30:45.456Z",
  "level": "warn",
  "message": "Security Event",
  "eventType": "LOGIN_FAILURE",
  "userEmail": "user@example.com",
  "ip": "192.168.1.100",
  "result": "FAILURE",
  "severity": "MEDIUM",
  "metadata": {
    "reason": "Invalid password"
  }
}
```

### 3. Error Logs

**Nivel**: `error`
**Archivo**: `logs/error.log`

```json
{
  "timestamp": "2025-10-30T10:35:12.789Z",
  "level": "error",
  "message": "Database connection failed",
  "stack": "Error: Connection timeout\n    at ...",
  "correlationId": "1730284512789-def456uvw"
}
```

---

## 🔐 Request Logging

### RequestLoggingMiddleware

**Archivo**: `src/common/middleware/request-logging.middleware.ts`

#### Funcionalidad

1. **Log de Request Entrante**: Captura método, URL, IP, user agent, referer
2. **Correlation ID**: Genera ID único para trazabilidad
3. **Response Interceptor**: Intercepta la respuesta para medir tiempo
4. **Error Detection**: Detecta automáticamente errores 4xx y 5xx
5. **IP Extraction**: Obtiene IP real considerando proxies (X-Forwarded-For)

#### Metadatos Capturados

```typescript
{
  method: 'POST',
  url: '/api/bookings',
  ip: '192.168.1.100',           // IP real del cliente
  userAgent: 'Mozilla/5.0...',   // Navegador/Cliente
  referer: 'http://localhost',   // Origen del request
  correlationId: '...',          // ID único de trazabilidad
  statusCode: 201,               // HTTP status code
  responseTime: '45ms',          // Tiempo de respuesta
  contentLength: 1024,           // Tamaño de la respuesta
}
```

#### Correlation ID

Formato: `{timestamp}-{random}`

**Ejemplo**: `1730284245123-abc123xyz`

**Uso**: Permite rastrear un request a través de múltiples servicios/logs.

---

## 🛡️ Security Audit

### SecurityAuditService

**Archivo**: `src/common/logger/security-audit.service.ts`

#### Eventos de Seguridad

##### Authentication Events

| Evento | Severidad | Descripción |
|--------|-----------|-------------|
| `LOGIN_SUCCESS` | LOW | Login exitoso |
| `LOGIN_FAILURE` | MEDIUM | Intento de login fallido |
| `LOGOUT` | LOW | Usuario cerró sesión |
| `PASSWORD_RESET_REQUEST` | LOW | Solicitud de reset de contraseña |
| `PASSWORD_RESET_SUCCESS` | MEDIUM | Contraseña reseteada exitosamente |
| `PASSWORD_CHANGED` | MEDIUM | Contraseña cambiada |

##### Authorization Events

| Evento | Severidad | Descripción |
|--------|-----------|-------------|
| `ACCESS_DENIED` | MEDIUM | Acceso denegado por permisos |
| `PERMISSION_VIOLATION` | HIGH | Intento de violación de permisos |
| `ROLE_ESCALATION_ATTEMPT` | CRITICAL | Intento de escalamiento de privilegios |

##### Security Violations

| Evento | Severidad | Descripción |
|--------|-----------|-------------|
| `RATE_LIMIT_EXCEEDED` | MEDIUM | Rate limit excedido |
| `INVALID_TOKEN` | HIGH | Token JWT inválido |
| `CSRF_VIOLATION` | HIGH | Violación de CSRF |
| `XSS_ATTEMPT` | HIGH | Intento de XSS |
| `SQL_INJECTION_ATTEMPT` | CRITICAL | Intento de SQL injection |

##### Payment Security

| Evento | Severidad | Descripción |
|--------|-----------|-------------|
| `PAYMENT_INITIATED` | MEDIUM | Pago iniciado |
| `PAYMENT_SUCCESS` | MEDIUM | Pago exitoso |
| `PAYMENT_FAILURE` | MEDIUM | Pago fallido |
| `PAYMENT_FRAUD_DETECTED` | CRITICAL | Fraude detectado |

#### Niveles de Severidad

```typescript
'LOW'      → 'info'   // Eventos normales
'MEDIUM'   → 'info'   // Eventos importantes
'HIGH'     → 'warn'   // Eventos sospechosos
'CRITICAL' → 'error'  // Incidentes de seguridad
```

---

## 💻 Ejemplos de Uso

### 1. Logging de Login en AuthService

```typescript
import { SecurityAuditService } from '../../common/logger/security-audit.service';

@Injectable()
export class AuthService {
  constructor(
    private securityAudit: SecurityAuditService,
  ) {}

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const user = await this.validateUser(loginDto);

    if (!user) {
      // Log login failure
      this.securityAudit.logLoginFailure(
        loginDto.email,
        ip,
        userAgent,
        'Invalid credentials',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log login success
    this.securityAudit.logLoginSuccess(
      user.id,
      user.email,
      ip,
      userAgent,
    );

    return this.generateTokens(user);
  }
}
```

### 2. Logging de Pagos en PaymentsService

```typescript
@Injectable()
export class PaymentsService {
  constructor(
    private securityAudit: SecurityAuditService,
  ) {}

  async processPayment(userId: string, amount: number, bookingId: string, ip: string) {
    const user = await this.usersService.findOne(userId);

    // Log payment initiation
    this.securityAudit.logPaymentInitiated(
      userId,
      user.email,
      amount,
      bookingId,
      ip,
    );

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
      });

      // Log payment success
      this.securityAudit.logPaymentSuccess(
        userId,
        user.email,
        amount,
        paymentIntent.id,
        bookingId,
      );

      return paymentIntent;
    } catch (error) {
      // Log payment failure
      this.securityAudit.logSecurityEvent({
        eventType: SecurityEventType.PAYMENT_FAILURE,
        userId,
        userEmail: user.email,
        result: 'FAILURE',
        message: `Payment failed for booking ${bookingId}`,
        severity: 'HIGH',
        metadata: { error: error.message },
      });

      throw error;
    }
  }
}
```

### 3. Logging de Access Control

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private securityAudit: SecurityAuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      // Log access denied
      this.securityAudit.logAccessDenied(
        user.id,
        user.email,
        request.url,
        request.method,
        request.ip,
      );
    }

    return hasRole;
  }
}
```

### 4. Obtener Correlation ID en un Request

```typescript
@Get('profile')
async getProfile(@Req() request: Request) {
  const correlationId = (request as any).correlationId;

  this.logger.log(`Fetching profile - CorrelationID: ${correlationId}`);

  return this.usersService.findProfile();
}
```

---

## 📊 Análisis de Logs

### Comandos Útiles

#### Ver logs en tiempo real

```bash
# Todos los logs
tail -f logs/combined.log

# Solo errores
tail -f logs/error.log

# Solo security audit
tail -f logs/security-audit.log

# Requests HTTP
tail -f logs/requests.log
```

#### Buscar por Correlation ID

```bash
grep "1730284245123-abc123xyz" logs/combined.log
```

#### Filtrar por tipo de evento

```bash
# Login failures
grep "LOGIN_FAILURE" logs/security-audit.log

# Rate limit violations
grep "RATE_LIMIT_EXCEEDED" logs/security-audit.log

# Payment events
grep "PAYMENT_" logs/security-audit.log
```

#### Analizar errores frecuentes

```bash
# Top 10 errores más comunes
cat logs/error.log | jq '.message' | sort | uniq -c | sort -rn | head -10

# IPs con más errores 4xx/5xx
cat logs/requests.log | jq 'select(.statusCode >= 400) | .ip' | sort | uniq -c | sort -rn
```

#### Métricas de performance

```bash
# Requests más lentos
cat logs/requests.log | jq 'select(.responseTime) | {url, responseTime}' | grep -v "0ms" | sort -t'"' -k4 -rn | head -10

# Tiempo promedio por endpoint
cat logs/requests.log | jq -r '.url + " " + .responseTime' | sort | uniq
```

---

## ✅ Mejores Prácticas

### 1. Siempre Loguear Eventos de Seguridad

```typescript
// ✅ CORRECTO
this.securityAudit.logLoginFailure(email, ip, userAgent, 'Invalid password');

// ❌ INCORRECTO - No loguear evento de seguridad
throw new UnauthorizedException('Invalid credentials');
```

### 2. Incluir Metadata Relevante

```typescript
// ✅ CORRECTO - Metadata útil
this.securityAudit.logSecurityEvent({
  eventType: SecurityEventType.ACCESS_DENIED,
  userId: user.id,
  userEmail: user.email,
  resource: '/admin/users',
  action: 'DELETE',
  result: 'DENIED',
  metadata: {
    requiredRole: 'ADMIN',
    actualRole: user.role,
  },
});

// ❌ INCORRECTO - Sin context
this.logger.log('Access denied');
```

### 3. No Loguear Información Sensible

```typescript
// ❌ NUNCA loguear passwords, tokens, PII sin cifrar
this.logger.log(`User password: ${password}`);
this.logger.log(`Credit card: ${cardNumber}`);

// ✅ CORRECTO - Loguear solo información no sensible
this.logger.log(`Password reset for user ${userId}`);
this.logger.log(`Payment processed for booking ${bookingId}`);
```

### 4. Usar Niveles de Log Apropiados

```typescript
// ✅ CORRECTO
this.logger.debug('Cache hit for key: users:123');      // Debug
this.logger.log('User profile updated');                // Info
this.logger.warn('Rate limit approaching threshold');   // Warn
this.logger.error('Database connection failed', error); // Error
```

### 5. Incluir Correlation IDs

```typescript
// ✅ CORRECTO
this.logger.log(`Processing payment - CorrelationID: ${correlationId}`);

// Permite rastrear el request completo:
// Request received → CorrelationID: 123-abc
// Auth validated → CorrelationID: 123-abc
// Payment processed → CorrelationID: 123-abc
// Response sent → CorrelationID: 123-abc
```

---

## 🔧 Troubleshooting

### Problema: Los logs no se están generando

**Causa**: Permisos insuficientes en el directorio `logs/`

**Solución**:
```bash
mkdir -p logs
chmod 755 logs
```

### Problema: Los archivos de logs crecen demasiado

**Causa**: Configuración de rotación no está funcionando

**Solución**: Verificar que Winston esté usando `maxsize` y `maxFiles`:

```typescript
new winston.transports.File({
  filename: 'logs/combined.log',
  maxsize: 10485760, // 10MB
  maxFiles: 10,      // Mantener 10 archivos
})
```

### Problema: No se ven logs en desarrollo

**Causa**: Nivel de log muy restrictivo

**Solución**: Cambiar `LOG_LEVEL=debug` en `.env`

### Problema: Logs de requests no aparecen

**Causa**: Middleware no está aplicado

**Solución**: Verificar en `app.module.ts`:

```typescript
consumer.apply(RequestLoggingMiddleware).forRoutes('*');
```

---

## 📚 Referencias

- [Winston Documentation](https://github.com/winstonjs/winston)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## ✅ Checklist de Implementación

- [x] Winston configurado con múltiples transports
- [x] Request logging middleware
- [x] Security audit service
- [x] Correlation IDs
- [x] Error logging con stack traces
- [x] Log rotation configurado
- [x] Logs excluidos de Git (.gitignore)
- [x] Variables de entorno documentadas
- [x] Tests unitarios (37 tests)
- [x] Documentación completa

---

**Última actualización**: 30 de Octubre de 2025
**Mantenido por**: LACA-SOFT
