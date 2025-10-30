# Rate Limiting - EventPass API

## Descripción General

EventPass implementa rate limiting para proteger la API contra abuso, ataques de fuerza bruta y uso excesivo de recursos.

## Límites Configurados

### 1. Límite Global

**Aplicado a**: Todos los endpoints
**Límite**: 100 requests por minuto por IP
**Configurable en**: `.env` → `THROTTLE_LIMIT` y `THROTTLE_TTL`

```bash
THROTTLE_TTL=60000           # 60 segundos
THROTTLE_LIMIT=100           # 100 requests por ventana
```

### 2. Límite de Login

**Aplicado a**: `POST /auth/login`
**Límite**: 5 intentos por minuto por IP
**Propósito**: Prevenir ataques de fuerza bruta
**Configurable en**: `.env` → `THROTTLE_LOGIN_LIMIT`

```bash
THROTTLE_LOGIN_LIMIT=5       # 5 intentos por minuto
```

### 3. Límite de Forgot Password

**Aplicado a**: `POST /auth/forgot-password`
**Límite**: 3 intentos por minuto por IP
**Propósito**: Prevenir abuse de recuperación de contraseña
**Configurable en**: `.env` → `THROTTLE_FORGOT_PASSWORD_LIMIT`

```bash
THROTTLE_FORGOT_PASSWORD_LIMIT=3  # 3 intentos por minuto
```

---

## Headers de Respuesta

Cuando se hace un request a un endpoint con rate limiting, la API incluye headers informativos:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1699999999999
```

### Descripción de Headers

| Header | Descripción | Ejemplo |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Número máximo de requests permitidos | `100` |
| `X-RateLimit-Remaining` | Requests restantes en la ventana actual | `73` |
| `X-RateLimit-Reset` | Unix timestamp (ms) cuando se resetea el límite | `1699999999999` |

---

## Respuesta 429 (Rate Limit Exceeded)

Cuando se excede el límite, la API retorna un error `429 Too Many Requests`:

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests"
}
```

**Headers adicionales en 429**:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699999999999
```

---

## Implementación Frontend

### 1. Manejo de Headers

```typescript
// Ejemplo en TypeScript/JavaScript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

function getRateLimitInfo(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
  };
}

// Uso
const response = await fetch('https://api.eventpass.com/events');
const rateLimitInfo = getRateLimitInfo(response);

console.log(`Requests restantes: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
```

### 2. Manejo de Error 429

```typescript
async function makeRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset)) : null;

      throw new Error(
        `Rate limit exceeded. Try again after ${resetTime?.toLocaleTimeString() || 'a moment'}`,
      );
    }

    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### 3. Retry con Backoff Exponencial

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limit exceeded - wait before retry
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const waitTime = resetTime
          ? Math.max(parseInt(resetTime) - Date.now(), 1000)
          : Math.pow(2, attempt) * 1000; // Exponential backoff

        console.log(`Rate limited. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError!;
}
```

### 4. UI Warning Component (React Example)

```tsx
import React, { useState, useEffect } from 'react';

interface RateLimitWarningProps {
  remaining: number;
  limit: number;
}

export const RateLimitWarning: React.FC<RateLimitWarningProps> = ({ remaining, limit }) => {
  const percentage = (remaining / limit) * 100;

  if (percentage > 20) return null; // Don't show if > 20% remaining

  return (
    <div className="alert alert-warning">
      ⚠️ Approaching rate limit: {remaining}/{limit} requests remaining.
      {percentage === 0 && <p>Please wait before making more requests.</p>}
    </div>
  );
};
```

---

## Best Practices para Frontend

### 1. Cache de Datos

Minimiza requests cacheando datos localmente:

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();

async function fetchWithCache(url: string, ttl: number = 60000) {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();

  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### 2. Debouncing de Búsquedas

Implementa debouncing para inputs de búsqueda:

```typescript
import { debounce } from 'lodash';

const searchEvents = debounce(async (query: string) => {
  const response = await fetch(`/events?search=${query}`);
  return response.json();
}, 500); // Wait 500ms after user stops typing
```

### 3. Batch Requests

Agrupa múltiples requests en uno solo cuando sea posible:

```typescript
// ❌ Bad: Multiple requests
const event1 = await fetch('/events/1');
const event2 = await fetch('/events/2');
const event3 = await fetch('/events/3');

// ✅ Good: Single request
const events = await fetch('/events?ids=1,2,3');
```

### 4. Mostrar Indicadores de Progreso

Informa al usuario sobre el estado de rate limiting:

```typescript
function RateLimitIndicator({ remaining, limit }: { remaining: number; limit: number }) {
  const percentage = (remaining / limit) * 100;

  return (
    <div className="rate-limit-indicator">
      <div className="progress-bar" style={{ width: `${percentage}%` }} />
      <span>
        {remaining}/{limit} requests available
      </span>
    </div>
  );
}
```

---

## Testing Rate Limits

### Manual Testing

```bash
# Test global rate limit
for i in {1..105}; do
  curl http://localhost:3000/events
  echo "Request $i"
done

# Test login rate limit
for i in {1..7}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Login attempt $i"
done
```

### Automated Testing

Ver tests E2E en:
- `test/e2e/security/rate-limiting.e2e-spec.ts`

---

## Configuración en Producción

### Recomendaciones

1. **Aumentar límites para producción**:
```bash
# .env.production
THROTTLE_LIMIT=500           # More lenient for production traffic
THROTTLE_LOGIN_LIMIT=10      # Still strict for security
THROTTLE_FORGOT_PASSWORD_LIMIT=5
```

2. **Usar Redis para rate limiting distribuido**:
   - Por defecto, rate limiting usa memoria local
   - Para múltiples instancias, configurar Redis como storage

3. **Monitorear rate limit hits**:
   - Usar logs para identificar IPs que hitting limits frecuentemente
   - Considerar whitelist para IPs confiables

4. **Ajustar por endpoint**:
   - Endpoints públicos (browse): Más permisivos
   - Endpoints sensibles (auth): Más restrictivos
   - Endpoints computacionalmente caros (analytics): Restrictivos

### Excepciones

Para permitir IPs específicas bypass rate limiting:

```typescript
// src/common/guards/rate-limit.guard.ts
protected getTracker(req: Record<string, any>): Promise<string> {
  const ip = req.ips.length ? req.ips[0] : req.ip;

  // Whitelist específicas IPs
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  if (whitelistedIPs.includes(ip)) {
    return Promise.resolve(`whitelisted-${ip}`);
  }

  return Promise.resolve(ip);
}
```

---

## Troubleshooting

### Problema: Rate limit demasiado agresivo en desarrollo

**Solución**: Configurar límites más altos en `.env.development`:
```bash
THROTTLE_LIMIT=1000
THROTTLE_LOGIN_LIMIT=50
```

### Problema: Múltiples usuarios detrás de mismo proxy/NAT

**Síntoma**: Usuarios legítimos siendo rate limited
**Solución**:
1. Verificar que `X-Forwarded-For` esté configurado correctamente
2. Aumentar límites globales
3. Considerar autenticación basada en user ID en lugar de IP

### Problema: Rate limit no se resetea

**Causa**: Servidor reiniciado (rate limits en memoria)
**Solución**: Implementar Redis para persistencia

---

## Swagger Documentation

Todos los endpoints con rate limiting tienen documentación en Swagger:

```
http://localhost:3000/api
```

Busca la respuesta `429 Too Many Requests` en cada endpoint para ver los límites específicos.

---

## Soporte

Para reportar problemas o sugerencias sobre rate limiting:
- GitHub Issues: [eventpass/issues](https://github.com/eventpass/issues)
- Email: support@eventpass.com

---

**Última actualización**: 2025-10-30
**Versión**: 1.0.0
