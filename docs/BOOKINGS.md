# Módulo de Reservas (Bookings)

## Descripción

El módulo de reservas maneja todo el ciclo de vida de las reservas de boletos (tickets) en la plataforma EventPass. Implementa control de concurrencia distribuida con Redis para prevenir sobreventa, y gestiona el proceso completo desde la reserva temporal hasta la confirmación post-pago.

**Base URL:** `http://localhost:3000/api/v1/bookings`

---

## Características Principales

- **Lock Distribuido con Redis**: Previene doble venta usando locks a nivel de evento
- **Transacciones SERIALIZABLE**: Garantiza consistencia en inventario de tickets
- **Reservas Temporales**: Las reservas expiran en 10 minutos si no se completa el pago
- **Generación de Tickets**: Códigos únicos generados al confirmar el pago
- **Job de Expiración**: Automáticamente cancela reservas expiradas y libera tickets

---

## Endpoints

### 1. Crear Reserva Temporal

Crea una reserva temporal de boletos con lock distribuido para prevenir sobreventa.

**Endpoint:** `POST /bookings/reserve`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `cliente`, `organizador`, `admin`, `super_admin`

**Request Body:**
```json
{
  "eventId": "660e8400-e29b-41d4-a716-446655440001",
  "quantity": 2
}
```

**Validaciones:**
- `eventId`: UUID válido, evento debe existir
- `quantity`: Número entero entre 1 y 10

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/bookings/reserve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "660e8400-e29b-41d4-a716-446655440001",
    "quantity": 2
  }'
```

**Response 201 (Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "660e8400-e29b-41d4-a716-446655440001",
  "userId": "770e8400-e29b-41d4-a716-446655440002",
  "quantity": 2,
  "unitPrice": 50.0,
  "subtotal": 100.0,
  "serviceFee": 15.0,
  "total": 115.0,
  "status": "pendiente",
  "expiresAt": "2025-01-28T18:40:00.000Z",
  "event": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Festival Rock 2025",
    "eventDate": "2025-12-31T20:00:00.000Z",
    "venue": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Auditorio Nacional",
      "city": "Ciudad de México"
    }
  },
  "createdAt": "2025-01-28T18:30:00.000Z",
  "updatedAt": "2025-01-28T18:30:00.000Z"
}
```

**Cálculo de Precios:**
- `unitPrice`: Precio del ticket (desde el evento)
- `subtotal`: unitPrice × quantity
- `serviceFee`: 15% del subtotal (tarifa de la plataforma)
- `total`: subtotal + serviceFee

**Response 400 (Bad Request):**
```json
{
  "statusCode": 400,
  "message": "No hay suficientes boletos disponibles. Disponibles: 5, Solicitados: 10",
  "error": "Bad Request"
}
```

**Otros errores posibles (400):**
- "El evento no está disponible para reservas"
- "El evento ya finalizó"
- "La cantidad mínima de boletos es 1"
- "La cantidad máxima de boletos es 10"

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Evento no encontrado",
  "error": "Not Found"
}
```

**Response 409 (Conflict - Lock no disponible):**
```json
{
  "statusCode": 409,
  "message": "Sistema ocupado: no se pudo adquirir lock para booking:event:660e8400-e29b-41d4-a716-446655440001",
  "error": "Conflict"
}
```

---

### 2. Obtener Detalle de Reserva

Obtiene la información completa de una reserva por su ID.

**Endpoint:** `GET /bookings/:id`

**Autenticación:** JWT requerido

**Autorización:** Owner del booking, `admin`, `super_admin`

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Festival Rock 2025",
    "eventDate": "2025-12-31T20:00:00.000Z",
    "venue": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Auditorio Nacional",
      "address": "Paseo de la Reforma 50, Ciudad de México",
      "city": "Ciudad de México"
    }
  },
  "quantity": 2,
  "unitPrice": 50.0,
  "subtotal": 100.0,
  "serviceFee": 15.0,
  "total": 115.0,
  "status": "confirmado",
  "paymentStatus": "succeeded",
  "tickets": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "ticketCode": "TKT-2025-A1B2C3",
      "status": "valid"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "ticketCode": "TKT-2025-D4E5F6",
      "status": "valid"
    }
  ],
  "createdAt": "2025-01-28T18:30:00.000Z",
  "confirmedAt": "2025-01-28T18:35:00.000Z"
}
```

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para ver esta reserva",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Reserva no encontrada",
  "error": "Not Found"
}
```

---

### 3. Listar Mis Reservas

Lista todas las reservas del usuario autenticado con paginación y filtros opcionales.

**Endpoint:** `GET /bookings/my-bookings`

**Autenticación:** JWT requerido

**Autorización:** Todos los usuarios autenticados

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| page | number | No | 1 | Número de página |
| limit | number | No | 20 | Cantidad de resultados por página |
| status | string | No | - | Filtrar por estado: `pendiente`, `confirmado`, `cancelado`, `fallido` |

**cURL:**
```bash
# Listar todas mis reservas
curl -X GET http://localhost:3000/api/v1/bookings/my-bookings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar solo reservas confirmadas
curl -X GET "http://localhost:3000/api/v1/bookings/my-bookings?status=confirmado" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Con paginación
curl -X GET "http://localhost:3000/api/v1/bookings/my-bookings?page=2&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "event": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Festival Rock 2025",
        "eventDate": "2025-12-31T20:00:00.000Z",
        "venue": {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "name": "Auditorio Nacional",
          "address": "Paseo de la Reforma 50",
          "city": "Ciudad de México"
        }
      },
      "quantity": 2,
      "unitPrice": 50.0,
      "subtotal": 100.0,
      "serviceFee": 15.0,
      "total": 115.0,
      "status": "confirmado",
      "paymentStatus": "succeeded",
      "tickets": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "ticketCode": "TKT-2025-A1B2C3",
          "status": "valid"
        }
      ],
      "createdAt": "2025-01-28T18:30:00.000Z",
      "confirmedAt": "2025-01-28T18:35:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 4. Confirmar Reserva (Interno)

Confirma una reserva después de que el pago fue procesado exitosamente. Genera los tickets con códigos únicos.

**Endpoint:** `POST /bookings/:id/confirm`

**Autenticación:** JWT requerido

**Autorización:** `cliente`, `organizador`, `admin`, `super_admin`

**Nota:** Este endpoint es llamado internamente por el webhook de Stripe. No debe ser llamado directamente por clientes en producción.

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890abcdef"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/bookings/550e8400-e29b-41d4-a716-446655440000/confirm \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_1234567890abcdef"
  }'
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmado",
  "paymentStatus": "succeeded",
  "confirmedAt": "2025-01-28T18:35:00.000Z",
  "tickets": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "ticketCode": "TKT-2025-A1B2C3",
      "status": "valid"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "ticketCode": "TKT-2025-D4E5F6",
      "status": "valid"
    }
  ]
}
```

**Response 400 (Bad Request):**
```json
{
  "statusCode": 400,
  "message": "La reserva ya fue procesada con estado: confirmado",
  "error": "Bad Request"
}
```

**Otros errores posibles (400):**
- "La reserva ha expirado"

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Reserva no encontrada",
  "error": "Not Found"
}
```

---

## Estados de Reserva

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Reserva creada, esperando pago. Expira en 10 minutos |
| `confirmado` | Pago exitoso, tickets generados |
| `cancelado` | Cancelada por el usuario o por expiración |
| `fallido` | Pago fallido |

---

## Estados de Tickets

| Estado | Descripción |
|--------|-------------|
| `valid` | Ticket válido, puede usarse |
| `used` | Ticket ya usado (entrada al evento) |
| `cancelled` | Ticket cancelado |

---

## Formato de Códigos de Ticket

Los códigos de ticket siguen el formato: `TKT-YYYY-XXXXXX`

- `TKT`: Prefijo fijo
- `YYYY`: Año actual
- `XXXXXX`: 6 caracteres aleatorios alfanuméricos

**Ejemplo:** `TKT-2025-A1B2C3`

---

## Flujo Completo de Reserva

```
1. Usuario crea reserva temporal
   POST /bookings/reserve
   ↓
2. Sistema reserva tickets con lock distribuido
   ↓
3. Reserva tiene 10 minutos para completar pago
   ↓
4. Usuario crea payment intent
   POST /payments/create-intent
   ↓
5. Usuario completa pago en Stripe
   ↓
6. Stripe envía webhook a la plataforma
   POST /payments/webhook
   ↓
7. Sistema confirma reserva y genera tickets
   POST /bookings/:id/confirm (llamado internamente)
   ↓
8. Sistema envía email con tickets al usuario
   ↓
9. Usuario recibe boletos con códigos únicos
```

---

## Control de Concurrencia

El sistema implementa múltiples capas de protección contra sobreventa:

### 1. Lock Distribuido (Redis)
- Lock a nivel de evento: `booking:event:{eventId}`
- Timeout: 5 segundos
- Solo un proceso puede reservar tickets de un evento a la vez

### 2. Transacción SERIALIZABLE
- Máximo nivel de aislamiento en PostgreSQL
- Previene anomalías de lectura y escritura

### 3. Pessimistic Locking
- `SELECT ... FOR UPDATE` en el evento
- Bloquea el registro durante la transacción

### 4. Decremental Atómico
- `UPDATE events SET availableTickets = availableTickets - quantity`
- Operación atómica a nivel de base de datos

---

## Manejo de Expiración

Las reservas pendientes expiran automáticamente después de 10 minutos:

1. **Job Programado**: Se programa un job en Bull Queue al crear la reserva
2. **Verificación**: El job verifica si la reserva sigue pendiente
3. **Cancelación**: Si está pendiente, cancela la reserva
4. **Liberación**: Libera los tickets de vuelta al inventario del evento
5. **Notificación**: Opcionalmente envía email de expiración

---

## Ejemplos de Uso

### Flujo Exitoso

```bash
# 1. Crear reserva
BOOKING_RESPONSE=$(curl -X POST http://localhost:3000/api/v1/bookings/reserve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-uuid-123",
    "quantity": 2
  }')

BOOKING_ID=$(echo $BOOKING_RESPONSE | jq -r '.id')

# 2. Crear payment intent
PAYMENT_RESPONSE=$(curl -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\"
  }")

CLIENT_SECRET=$(echo $PAYMENT_RESPONSE | jq -r '.clientSecret')

# 3. Completar pago en frontend con Stripe.js usando CLIENT_SECRET
# (El webhook de Stripe confirmará automáticamente la reserva)

# 4. Verificar reserva confirmada
curl -X GET http://localhost:3000/api/v1/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Listar Reservas Confirmadas

```bash
curl -X GET "http://localhost:3000/api/v1/bookings/my-bookings?status=confirmado" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notas Importantes

- **Tarifa de Servicio:** 15% del subtotal (configurable)
- **Tiempo de Expiración:** 10 minutos (configurable)
- **Máximo de Tickets por Reserva:** 10 boletos
- **Idempotencia:** Los webhooks de Stripe se procesan de forma idempotente
- **Emails:** Se envían automáticamente al confirmar o fallar un pago
- **Concurrencia:** El sistema soporta cientos de usuarios comprando simultáneamente

---

## Códigos de Error HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Reserva creada exitosamente |
| 400 | Bad Request - Validación fallida o reserva expirada |
| 401 | Unauthorized - Token inválido o ausente |
| 403 | Forbidden - Sin permisos para ver la reserva |
| 404 | Not Found - Reserva o evento no encontrado |
| 409 | Conflict - Sistema ocupado, lock no disponible |
| 500 | Internal Server Error - Error del servidor |
