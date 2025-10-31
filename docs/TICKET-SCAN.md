# Módulo de Escaneo de Tickets (Ticket Scan)

## Descripción

El módulo de escaneo de tickets permite a los CHECKERs validar y registrar la entrada de asistentes a eventos mediante el escaneo de códigos QR de tickets. Implementa controles de seguridad avanzados incluyendo rate limiting, idempotencia, auditoría completa y eventos en tiempo real.

**Base URL:** `http://localhost:3000/api/v1/ticket-scan`

---

## Características Principales

- **Validación Multinivel**: Verifica ticket, evento, recinto, sector y asignación del checker
- **Idempotencia con Redis**: Previene doble escaneo usando header `Idempotency-Key` (TTL 24h)
- **Rate Limiting**: Límite de 10 escaneos por minuto por IP
- **Auditoría Completa**: Registra todos los intentos de escaneo con SecurityAuditService
- **Eventos en Tiempo Real (SSE)**: Actualizaciones de ocupación en tiempo real
- **Validación de Fechas**: Verifica que el evento esté activo y dentro del período válido
- **Asignación por Recinto**: Los checkers solo pueden escanear en sus recintos asignados

---

## Roles y Permisos

### CHECKER (checker)
- ✅ Escanear tickets (`POST /scan`)
- ✅ Ver mi historial de escaneos (`GET /my-scan-history`)
- ✅ Ver mis estadísticas de evento (`GET /event-stats/:eventId`)
- ✅ Ver ocupación de recinto (`GET /venue-occupancy/:eventId/:venueId`)
- ✅ Recibir eventos en tiempo real (`SSE /occupancy-updates/:eventId`)

### ADMIN / SUPER_ADMIN
- ✅ Ver ocupación de recinto (`GET /venue-occupancy/:eventId/:venueId`)
- ✅ Recibir eventos en tiempo real (`SSE /occupancy-updates/:eventId`)

---

## Endpoints

### 1. Escanear Ticket

Escanea y valida un ticket para registrar la entrada de un asistente al evento.

**Endpoint:** `POST /ticket-scan/scan`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `checker` únicamente

**Rate Limit:** 10 requests por minuto por IP

**Headers Requeridos:**
```
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <uuid-v4-or-unique-string-min-16-chars>
```

**Request Body:**
```json
{
  "code": "TKT-ABC123-XYZ789",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "venueId": "550e8400-e29b-41d4-a716-446655440001",
  "sectorId": "A-1"
}
```

**Validaciones:**
- `code`: String, código del ticket (requerido)
- `eventId`: UUID válido, evento debe existir (requerido)
- `venueId`: UUID válido, recinto opcional (recomendado)
- `sectorId`: String, sector opcional
- `Idempotency-Key`: Header obligatorio, mínimo 16 caracteres alfanuméricos

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/ticket-scan/scan \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "code": "TKT-ABC123-XYZ789",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "venueId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

#### Respuestas Exitosas

**200 OK - Ticket Válido:**
```json
{
  "status": "VALID",
  "message": "Entrada permitida. ¡Bienvenido!",
  "scannedAt": "2025-10-31T13:00:00.000Z",
  "ticket": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "ticketCode": "TKT-ABC123-XYZ789",
    "status": "USED",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "usedAt": "2025-10-31T13:00:00.000Z"
  },
  "booking": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "quantity": 2,
    "status": "CONFIRMED",
    "total": 100.00
  },
  "attendanceRecord": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "ticketId": "550e8400-e29b-41d4-a716-446655440002",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "venueId": "550e8400-e29b-41d4-a716-446655440001",
    "checkerId": "550e8400-e29b-41d4-a716-446655440005",
    "scanStatus": "VALID",
    "scannedAt": "2025-10-31T13:00:00.000Z"
  }
}
```

**200 OK - Ticket Rechazado (varios estados posibles):**

**Ticket ya usado:**
```json
{
  "status": "ALREADY_USED",
  "message": "Ticket ya utilizado el 31/10/2025 12:30:00",
  "scannedAt": "2025-10-31T13:00:00.000Z",
  "ticket": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "ticketCode": "TKT-ABC123-XYZ789",
    "status": "USED",
    "usedAt": "2025-10-31T12:30:00.000Z"
  }
}
```

**Ticket inválido:**
```json
{
  "status": "INVALID",
  "message": "Ticket no encontrado o código inválido",
  "scannedAt": "2025-10-31T13:00:00.000Z"
}
```

**Evento cerrado:**
```json
{
  "status": "EVENT_CLOSED",
  "message": "El evento está cerrado o ha sido cancelado",
  "scannedAt": "2025-10-31T13:00:00.000Z"
}
```

**Checker no asignado:**
```json
{
  "status": "NOT_ASSIGNED",
  "message": "No tienes permiso para escanear tickets de este evento",
  "scannedAt": "2025-10-31T13:00:00.000Z"
}
```

**Recinto incorrecto:**
```json
{
  "status": "WRONG_VENUE",
  "message": "El ticket no corresponde a este recinto",
  "scannedAt": "2025-10-31T13:00:00.000Z"
}
```

**Sector incorrecto:**
```json
{
  "status": "WRONG_SECTOR",
  "message": "El ticket no corresponde a este sector",
  "scannedAt": "2025-10-31T13:00:00.000Z"
}
```

#### Respuestas de Error

**400 Bad Request - Idempotency-Key faltante:**
```json
{
  "statusCode": 400,
  "message": "Idempotency-Key header is required for scan operations",
  "error": "Bad Request"
}
```

**400 Bad Request - Idempotency-Key inválida:**
```json
{
  "statusCode": 400,
  "message": "Idempotency-Key must be at least 16 characters long",
  "error": "Bad Request"
}
```

**403 Forbidden - No es CHECKER:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**429 Too Many Requests - Rate limit excedido:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

### 2. Obtener Ocupación de Recinto

Obtiene estadísticas de capacidad y ocupación en tiempo real de un recinto.

**Endpoint:** `GET /ticket-scan/venue-occupancy/:eventId/:venueId`

**Autenticación:** JWT requerido

**Autorización:** `checker`, `admin`, `super_admin`

**Parámetros de URL:**
- `eventId`: UUID del evento
- `venueId`: UUID del recinto

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/ticket-scan/venue-occupancy/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta 200 OK:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "venueId": "550e8400-e29b-41d4-a716-446655440001",
  "capacity": 1000,
  "currentOccupancy": 750,
  "occupancyPercentage": 75.00,
  "availableCapacity": 250
}
```

---

### 3. Ver Mi Historial de Escaneos

Obtiene el historial de escaneos realizados por el checker actual.

**Endpoint:** `GET /ticket-scan/my-scan-history`

**Autenticación:** JWT requerido

**Autorización:** `checker` únicamente

**Query Parameters (opcional):**
- `eventId`: Filtrar por evento específico

**cURL:**
```bash
# Sin filtro
curl -X GET http://localhost:3000/api/v1/ticket-scan/my-scan-history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Con filtro por evento
curl -X GET http://localhost:3000/api/v1/ticket-scan/my-scan-history?eventId=550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta 200 OK:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "ticketId": "550e8400-e29b-41d4-a716-446655440002",
    "ticketCode": "TKT-ABC123-XYZ789",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "venueId": "550e8400-e29b-41d4-a716-446655440001",
    "checkerId": "550e8400-e29b-41d4-a716-446655440005",
    "scanStatus": "VALID",
    "scannedAt": "2025-10-31T13:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "ticketId": "550e8400-e29b-41d4-a716-446655440006",
    "ticketCode": "TKT-DEF456-ABC123",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "venueId": "550e8400-e29b-41d4-a716-446655440001",
    "checkerId": "550e8400-e29b-41d4-a716-446655440005",
    "scanStatus": "ALREADY_USED",
    "scannedAt": "2025-10-31T13:05:00.000Z"
  }
]
```

---

### 4. Ver Mis Estadísticas de Evento

Obtiene estadísticas de escaneos realizados por el checker en un evento específico.

**Endpoint:** `GET /ticket-scan/event-stats/:eventId`

**Autenticación:** JWT requerido

**Autorización:** `checker` únicamente

**Parámetros de URL:**
- `eventId`: UUID del evento

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/ticket-scan/event-stats/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta 200 OK:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "checkerId": "550e8400-e29b-41d4-a716-446655440005",
  "totalScans": 150,
  "validScans": 142,
  "rejectedScans": 8,
  "successRate": 94.67
}
```

---

### 5. Eventos en Tiempo Real (SSE)

Endpoint para recibir actualizaciones de ocupación en tiempo real mediante Server-Sent Events.

**Endpoint:** `GET /ticket-scan/occupancy-updates/:eventId`

**Autenticación:** JWT requerido

**Autorización:** `checker`, `admin`, `super_admin`

**Protocolo:** Server-Sent Events (SSE)

**Parámetros de URL:**
- `eventId`: UUID del evento a monitorear

**JavaScript Client Example:**
```javascript
const eventId = '550e8400-e29b-41d4-a716-446655440000';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const eventSource = new EventSource(
  `http://localhost:3000/api/v1/ticket-scan/occupancy-updates/${eventId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Occupancy update:', data);

  // Actualizar UI
  updateOccupancyDisplay(data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

**Formato de Eventos Recibidos:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "venueId": "550e8400-e29b-41d4-a716-446655440001",
  "currentOccupancy": 751,
  "capacity": 1000,
  "occupancyPercentage": 75.10,
  "ticketScanned": {
    "ticketId": "550e8400-e29b-41d4-a716-446655440002",
    "ticketCode": "TKT-ABC123-XYZ789",
    "checkerId": "550e8400-e29b-41d4-a716-446655440005",
    "scanStatus": "VALID",
    "scannedAt": "2025-10-31T13:00:00.000Z"
  }
}
```

---

## Estados de Escaneo (ScanStatus)

| Estado | Descripción |
|--------|-------------|
| `VALID` | Ticket válido, entrada permitida |
| `ALREADY_USED` | Ticket ya fue usado anteriormente |
| `INVALID` | Ticket no encontrado o código inválido |
| `EVENT_CLOSED` | Evento cerrado, cancelado o fuera de horario |
| `NOT_ASSIGNED` | Checker no asignado a este evento/recinto |
| `WRONG_VENUE` | Ticket no corresponde al recinto escaneado |
| `WRONG_SECTOR` | Ticket no corresponde al sector escaneado |
| `CANCELLED` | Ticket cancelado |
| `BOOKING_CANCELLED` | La reserva asociada fue cancelada |

---

## Proceso de Validación de Escaneo

El sistema realiza las siguientes validaciones en orden:

1. **Validación de Idempotency-Key**
   - Verifica que el header esté presente y sea válido
   - Busca en cache si ya existe una respuesta para esta key
   - Si existe, retorna la respuesta cacheada (operación idempotente)

2. **Validación de Ticket**
   - Busca el ticket por código
   - Verifica que exista en la base de datos

3. **Validación de Evento**
   - Verifica que el ticket pertenezca al evento correcto
   - Confirma que el evento exista y esté activo
   - Valida que no esté cancelado
   - Verifica que esté dentro del período válido (hasta 24h después del evento)

4. **Validación de Asignación de Checker**
   - Confirma que el checker esté asignado al evento
   - Si se proporciona `venueId`, verifica asignación específica al recinto

5. **Validación de Recinto** (si se proporciona)
   - Verifica que el ticket pertenezca al recinto correcto
   - Confirma asignación del checker al recinto

6. **Validación de Sector** (si se proporciona)
   - Verifica que el ticket pertenezca al sector correcto

7. **Validación de Estado del Ticket**
   - Verifica que no haya sido usado previamente
   - Confirma que no esté cancelado
   - Verifica que la reserva no esté cancelada

8. **Registro de Asistencia**
   - Marca el ticket como `USED`
   - Crea registro en `attendance_records`
   - Genera log de auditoría de seguridad
   - Emite evento en tiempo real de actualización de ocupación
   - Cachea la respuesta con la `Idempotency-Key`

---

## Idempotencia

### ¿Qué es Idempotencia?

La idempotencia garantiza que múltiples peticiones idénticas produzcan el mismo resultado que una sola petición. Esto es crucial para prevenir doble escaneo en casos de:

- Fallos de red que causan retry automático
- Usuario presiona el botón de escanear múltiples veces
- Timeout que provoca reintento de la aplicación

### Implementación

El sistema usa el header `Idempotency-Key` combinado con Redis cache:

1. **Cliente genera una key única** (UUID v4 recomendado)
2. **Primera petición**: Sistema procesa, guarda respuesta en cache (TTL 24h)
3. **Peticiones subsiguientes con misma key**: Sistema retorna respuesta cacheada sin procesar de nuevo

### Formato de Idempotency-Key

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Requisitos:**
- Mínimo 16 caracteres
- Solo caracteres alfanuméricos, guiones y guiones bajos
- UUID v4 recomendado para máxima unicidad
- Debe ser único por operación de escaneo

### Scope de Idempotencia

Las keys están scoped por checker:
- `idempotency:ticket-scan:{checkerId}:{idempotencyKey}`
- Dos checkers pueden usar la misma key sin conflictos
- Un checker no puede reescribar la operación de otro checker

### TTL (Time To Live)

- **Duración**: 24 horas
- **Razón**: Permite retry seguro durante todo el día del evento
- **Limpieza**: Redis elimina automáticamente keys expiradas

---

## Rate Limiting

### Configuración

El endpoint `/scan` tiene rate limiting específico:

- **Límite por defecto**: 10 requests por minuto por IP
- **Variable de entorno**: `THROTTLE_TICKET_SCAN_LIMIT`
- **Window**: 60 segundos (configurable con `THROTTLE_TTL`)

### Response Headers

Cuando se aplica rate limiting, el sistema retorna estos headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1698754800000
```

### Error Response

Cuando se excede el límite:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698754860000

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## Auditoría de Seguridad

Todos los intentos de escaneo se registran en el sistema de auditoría con los siguientes campos:

- **eventType**: Tipo de evento de seguridad
  - `TICKET_SCAN_VALID`
  - `TICKET_SCAN_ALREADY_USED`
  - `TICKET_SCAN_INVALID`
  - `TICKET_SCAN_EVENT_CLOSED`
  - `TICKET_SCAN_NOT_ASSIGNED`
  - `TICKET_SCAN_WRONG_VENUE`
  - `TICKET_SCAN_WRONG_SECTOR`
  - `TICKET_SCAN_CANCELLED`
  - `TICKET_SCAN_BOOKING_CANCELLED`

- **userId**: ID del checker
- **severity**: Nivel de severidad (LOW, MEDIUM, HIGH)
- **details**: Información completa del intento de escaneo
- **ipAddress**: IP desde donde se realizó el escaneo
- **userAgent**: User agent del cliente
- **timestamp**: Fecha y hora del evento

### Consulta de Logs

Los logs se pueden consultar usando el servicio de logging:

```typescript
// Buscar todos los escaneos de un checker
const logs = await securityAuditService.findByUserId(checkerId);

// Buscar escaneos inválidos
const invalidScans = await securityAuditService.findByEventType(
  SecurityEventType.TICKET_SCAN_INVALID
);
```

---

## Casos de Uso

### 1. Escaneo Normal en Entrada Principal

```bash
# Checker escanea un ticket en la entrada principal
curl -X POST http://localhost:3000/api/v1/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "code": "TKT-ABC123-XYZ789",
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "venueId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

### 2. Monitoreo de Ocupación en Tiempo Real

```javascript
// Dashboard de administración monitoreando ocupación
const eventId = '550e8400-e29b-41d4-a716-446655440000';
const token = localStorage.getItem('adminToken');

const eventSource = new EventSource(
  `/api/v1/ticket-scan/occupancy-updates/${eventId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Actualizar gráfico de ocupación
  updateOccupancyChart(data.occupancyPercentage);

  // Alertar si se alcanza capacidad máxima
  if (data.occupancyPercentage >= 90) {
    showWarning('Aforo casi completo');
  }
};
```

### 3. Retry Seguro con Idempotencia

```javascript
// Cliente móvil con retry automático en caso de fallo de red
async function scanTicket(ticketCode, eventId, venueId) {
  // Generar key única para esta operación de escaneo
  const idempotencyKey = crypto.randomUUID();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/v1/ticket-scan/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey // Misma key en todos los retries
        },
        body: JSON.stringify({ code: ticketCode, eventId, venueId })
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limit, esperar antes de reintentar
        await sleep(2000);
      } else {
        break; // Error no retryable
      }
    } catch (error) {
      console.error('Network error:', error);
    }

    attempt++;
  }

  throw new Error('Failed to scan ticket after retries');
}
```

---

## Variables de Entorno

```bash
# Rate limiting para ticket scan (default: 10)
THROTTLE_TICKET_SCAN_LIMIT=10

# TTL general para throttling en milisegundos (default: 60000 = 1 minuto)
THROTTLE_TTL=60000

# Redis para idempotencia (cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

## Arquitectura

```
┌─────────────────┐
│  Cliente CHECKER│
│  (App Móvil)    │
└────────┬────────┘
         │ POST /scan + Idempotency-Key
         │
         ▼
┌─────────────────────────────────────────┐
│  TicketScanController                    │
│  ├─ Valida Idempotency-Key              │
│  ├─ Busca en Redis cache                │
│  └─ Si no existe cache, procesa scan    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  IdempotencyService                      │
│  ├─ Valida formato de key               │
│  ├─ getCachedResponse()                 │
│  └─ cacheResponse() con TTL 24h         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  TicketScanService                       │
│  ├─ Validación multinivel               │
│  ├─ Marca ticket como USED              │
│  ├─ Crea AttendanceRecord               │
│  ├─ Genera audit log                    │
│  └─ Emite evento SSE                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  TicketScanEventsService (RxJS)         │
│  └─ Emite evento a todos los clientes   │
│     suscritos al stream SSE             │
└─────────────────────────────────────────┘
```

---

## Testing

### Unit Tests

```bash
# Tests de IdempotencyService
npm run test:unit -- idempotency.service.spec.ts

# Tests de TicketScanController
npm run test:unit -- ticket-scan.controller.spec.ts

# Todos los tests del módulo
npm run test:unit -- ticket-scan
```

### Integration Tests

```bash
# Tests de integración completos
npm run test:integration -- ticket-scan

# Tests E2E
npm run test:e2e
```

### Coverage

El módulo tiene cobertura de tests para:
- ✅ Validación de idempotency keys (15 tests)
- ✅ Flujo completo de escaneo con idempotencia (12 tests)
- ✅ Rate limiting integration
- ✅ Cache hit/miss scenarios
- ✅ Aislamiento por checker

---

## Troubleshooting

### Error: "Idempotency-Key header is required"

**Problema**: Cliente no está enviando el header requerido.

**Solución**: Agregar header `Idempotency-Key` con valor único (UUID v4 recomendado).

```bash
curl ... -H "Idempotency-Key: $(uuidgen)"
```

### Error: "Too Many Requests" (429)

**Problema**: Se excedió el límite de 10 requests por minuto.

**Solución**:
1. Esperar 60 segundos antes de reintentar
2. Verificar que no haya loop infinito en el cliente
3. Aumentar `THROTTLE_TICKET_SCAN_LIMIT` si es necesario

### Ticket aparece como "ALREADY_USED" pero no se escaneó

**Problema**: Posible doble escaneo sin idempotencia.

**Solución**:
1. Verificar que el cliente esté usando idempotency keys únicas
2. Revisar logs de auditoría para identificar el primer escaneo:
   ```bash
   # Buscar en logs
   grep "TICKET_SCAN_VALID" logs/security-audit.log | grep "TKT-ABC123"
   ```

### SSE connection se cierra inesperadamente

**Problema**: Timeout de conexión o error de red.

**Solución**:
1. Implementar reconexión automática en el cliente
2. Verificar configuración de timeouts en nginx/load balancer
3. Usar heartbeat para mantener conexión activa

```javascript
eventSource.onerror = () => {
  setTimeout(() => {
    // Reconectar después de 5 segundos
    connectToSSE();
  }, 5000);
};
```

---

## Best Practices

### 1. Generación de Idempotency Keys

✅ **Correcto:**
```javascript
// Generar nueva key para cada operación de escaneo
const key = crypto.randomUUID();
```

❌ **Incorrecto:**
```javascript
// Reusar la misma key para múltiples escaneos
const key = 'my-fixed-key';
```

### 2. Manejo de Respuestas

✅ **Correcto:**
```javascript
if (response.status === 200) {
  const data = await response.json();
  if (data.status === 'VALID') {
    // Entrada permitida
    showSuccess();
  } else {
    // Entrada denegada, mostrar razón
    showError(data.message);
  }
}
```

❌ **Incorrecto:**
```javascript
// Asumir que 200 = entrada permitida
if (response.status === 200) {
  showSuccess(); // Puede ser ALREADY_USED!
}
```

### 3. Retry Logic

✅ **Correcto:**
```javascript
// Retry con exponential backoff
const delays = [1000, 2000, 4000];
for (let i = 0; i < delays.length; i++) {
  try {
    return await scanTicket(code, eventId, idempotencyKey);
  } catch (error) {
    if (i === delays.length - 1) throw error;
    await sleep(delays[i]);
  }
}
```

❌ **Incorrecto:**
```javascript
// Retry inmediato sin límite
while (true) {
  try {
    return await scanTicket(code, eventId, idempotencyKey);
  } catch (error) {
    // Retry inmediato puede exceder rate limit
  }
}
```

---

## Seguridad

### Medidas Implementadas

1. **Autenticación JWT**: Todos los endpoints requieren token válido
2. **Autorización por Rol**: Solo CHECKERs pueden escanear
3. **Rate Limiting**: Previene ataques de fuerza bruta
4. **Idempotencia**: Previene doble escaneo malicioso o accidental
5. **Auditoría Completa**: Todos los intentos se registran
6. **Validación de Asignación**: Checkers solo pueden escanear en sus eventos asignados
7. **Validación de Recinto**: Verificación de ubicación física del checker
8. **CORS**: Configurado para permitir solo orígenes autorizados

### Recomendaciones

- ✅ Rotar tokens JWT cada 24 horas
- ✅ Usar HTTPS en producción (obligatorio)
- ✅ Monitorear logs de auditoría diariamente
- ✅ Configurar alertas para escaneos INVALID consecutivos
- ✅ Implementar 2FA para usuarios CHECKER
- ✅ Revisar permisos de checkers semanalmente
- ✅ Backup diario de `attendance_records`

---

## Changelog

### v1.0.0 (2025-10-31)

**Nuevas Funcionalidades:**
- ✅ Sistema completo de escaneo de tickets
- ✅ Idempotencia con Redis y header Idempotency-Key
- ✅ Rate limiting específico (10 req/min)
- ✅ Eventos en tiempo real (SSE)
- ✅ Auditoría completa de seguridad
- ✅ Validación de fechas de evento
- ✅ Validación multinivel (evento, recinto, sector)
- ✅ Historial de escaneos por checker
- ✅ Estadísticas de rendimiento por evento
- ✅ Monitoreo de ocupación en tiempo real

**Tests:**
- ✅ 27 unit tests (100% coverage)
- ✅ Tests de idempotencia
- ✅ Tests de rate limiting
- ✅ Tests de validación de permisos

---

## Soporte

Para reportar bugs o solicitar features:
- **GitHub Issues**: https://github.com/tu-org/eventpass/issues
- **Documentación**: https://docs.eventpass.com
- **Email**: soporte@eventpass.com
