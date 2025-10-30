# Módulo de Pagos (Payments)

## Descripción

El módulo de pagos maneja la integración completa con Stripe para procesar pagos de reservas de boletos. Implementa Payment Intents de Stripe, manejo de webhooks con idempotencia, y gestión del ciclo de vida completo del pago.

**Base URL:** `http://localhost:3000/api/v1/payments`

---

## Integración con Stripe

EventPass utiliza **Stripe Payment Intents** para procesar pagos de forma segura:

- **Payment Intents**: Representan la intención de cobrar al cliente
- **Client Secret**: Token seguro para completar el pago en el frontend
- **Webhooks**: Notificaciones asíncronas sobre el estado del pago
- **Idempotencia**: Los eventos se procesan una sola vez

**Versión de API de Stripe:** `2025-09-30`

---

## Endpoints

### 1. Crear Payment Intent

Crea un Payment Intent en Stripe para procesar el pago de una reserva.

**Endpoint:** `POST /payments/create-intent`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `cliente`, `organizador`, `admin`, `super_admin`

**Request Body:**
```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validaciones:**
- `bookingId`: UUID válido, reserva debe existir
- La reserva debe estar en estado `pendiente`
- La reserva no debe haber expirado
- El usuario debe ser el owner de la reserva

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response 200 (OK):**
```json
{
  "clientSecret": "pi_1234567890_secret_abcdefghijk",
  "amount": 11500,
  "currency": "usd"
}
```

**Campos de la Respuesta:**
- `clientSecret`: Token para completar el pago con Stripe.js en el frontend
- `amount`: Monto en centavos (115.00 USD = 11500 centavos)
- `currency`: Moneda del pago (usd, clp, mxn, etc.)

**Response 400 (Bad Request):**
```json
{
  "statusCode": 400,
  "message": "La reserva ha expirado",
  "error": "Bad Request"
}
```

**Otros errores posibles (400):**
- "La reserva ya fue procesada con estado: confirmado"

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para pagar esta reserva",
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

### 2. Webhook de Stripe

Endpoint llamado por Stripe cuando ocurre un evento de pago. Este endpoint es **interno** y no debe ser llamado manualmente.

**Endpoint:** `POST /payments/webhook`

**Autenticación:** Validación de signature de Stripe (no JWT)

**Headers Requeridos:**
- `stripe-signature`: Signature enviada por Stripe para validar la autenticidad

**Eventos Manejados:**
- `payment_intent.succeeded`: Pago exitoso
- `payment_intent.payment_failed`: Pago fallido

**cURL (Ejemplo de Stripe):**
```bash
# Este request lo hace Stripe automáticamente
curl -X POST http://localhost:3000/api/v1/payments/webhook \
  -H "stripe-signature: t=1234567890,v1=signature_hash_here" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_1234567890",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_1234567890",
        "amount": 11500,
        "currency": "usd",
        "status": "succeeded",
        "metadata": {
          "bookingId": "550e8400-e29b-41d4-a716-446655440000"
        }
      }
    }
  }'
```

**Response 200 (OK):**
```json
{
  "received": true
}
```

**Response 400 (Bad Request - Signature inválida):**
```json
{
  "statusCode": 400,
  "message": "Signature inválida",
  "error": "Bad Request"
}
```

**Otros errores posibles (400):**
- "Amount mismatch" (el monto no coincide con la reserva)

---

## Flujo de Pago Completo

### 1. Frontend: Crear Payment Intent

```javascript
// 1. Crear reserva
const bookingResponse = await fetch('/api/v1/bookings/reserve', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: 'event-uuid-123',
    quantity: 2
  })
});

const booking = await bookingResponse.json();

// 2. Crear payment intent
const paymentResponse = await fetch('/api/v1/payments/create-intent', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bookingId: booking.id
  })
});

const { clientSecret } = await paymentResponse.json();
```

### 2. Frontend: Completar Pago con Stripe.js

```javascript
// 3. Cargar Stripe.js
const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY');

// 4. Confirmar el pago
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  {
    payment_method: {
      card: cardElement, // Elemento de tarjeta de Stripe Elements
      billing_details: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  }
);

if (error) {
  // Mostrar error al usuario
  console.error('Payment failed:', error.message);
} else if (paymentIntent.status === 'succeeded') {
  // Pago exitoso
  console.log('Payment succeeded!');
  // El webhook ya confirmará la reserva automáticamente
}
```

### 3. Backend: Webhook Procesa el Pago

```
1. Stripe envía webhook → POST /payments/webhook
2. Backend valida signature de Stripe
3. Backend verifica idempotencia (evento ya procesado?)
4. Si payment_intent.succeeded:
   - Actualiza payment a "succeeded"
   - Confirma reserva → bookingsService.confirm()
   - Genera tickets únicos
   - Incrementa soldTickets del evento
   - Envía email con tickets al usuario
5. Si payment_intent.payment_failed:
   - Actualiza payment a "failed"
   - Cancela reserva
   - Libera tickets de vuelta al inventario
   - Envía email de notificación de fallo
```

---

## Idempotencia de Webhooks

Stripe puede enviar el mismo webhook múltiples veces. EventPass implementa idempotencia para prevenir procesamiento duplicado:

### Estrategias de Idempotencia

1. **Verificación de `stripeEventId`**: Se almacena el ID del evento de Stripe en la tabla de pagos
2. **Double-check en transacción**: Dentro de la transacción, se verifica el estado actual del pago
3. **Logs de advertencia**: Si se detecta duplicado, se registra un warning

```typescript
// Ejemplo de verificación
const existingPayment = await paymentRepository.findOne({
  where: { stripeEventId: event.id }
});

if (existingPayment) {
  logger.warn(`Evento duplicado detectado: ${event.id}`);
  return { received: true }; // Ya fue procesado
}
```

---

## Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `pending` | Payment Intent creado, esperando confirmación |
| `succeeded` | Pago completado exitosamente |
| `failed` | Pago fallido |
| `cancelled` | Pago cancelado |

---

## Configuración de Stripe

### Variables de Entorno Requeridas

```bash
# Stripe Secret Key (para crear payment intents)
STRIPE_SECRET_KEY=sk_test_51xxxxxx

# Stripe Webhook Secret (para validar webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxx

# Moneda por defecto
STRIPE_CURRENCY=usd
```

### Obtener Webhook Secret

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Crear un nuevo webhook endpoint
3. URL: `https://your-domain.com/api/v1/payments/webhook`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copiar el "Signing secret" (whsec_xxxx)

---

## Testing con Stripe

### Tarjetas de Prueba

Stripe proporciona tarjetas de prueba para diferentes escenarios:

| Número | Escenario |
|--------|-----------|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 9995` | Pago rechazado - fondos insuficientes |
| `4000 0000 0000 9987` | Pago rechazado - tarjeta perdida |
| `4000 0025 0000 3155` | Requiere autenticación 3D Secure |

**Fecha de expiración:** Cualquier fecha futura (ej: 12/25)
**CVC:** Cualquier 3 dígitos (ej: 123)
**ZIP:** Cualquier 5 dígitos (ej: 12345)

### Testing de Webhooks Localmente

Usar Stripe CLI para forward webhooks a localhost:

```bash
# 1. Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Forward webhooks
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# 4. El CLI mostrará un webhook secret temporal
# Usar ese secret en STRIPE_WEBHOOK_SECRET
```

---

## Manejo de Errores

### Payment Failed

Cuando un pago falla, el sistema automáticamente:

1. Marca el payment como `failed`
2. Cancela la reserva
3. Libera los tickets de vuelta al inventario
4. Envía email de notificación al usuario
5. Registra el código y mensaje de error

**Códigos de Error Comunes de Stripe:**

| Código | Descripción |
|--------|-------------|
| `card_declined` | Tarjeta rechazada |
| `insufficient_funds` | Fondos insuficientes |
| `expired_card` | Tarjeta expirada |
| `incorrect_cvc` | CVC incorrecto |
| `processing_error` | Error de procesamiento |

### Amount Mismatch

Si el monto del Payment Intent no coincide con el total de la reserva:

```json
{
  "statusCode": 400,
  "message": "Amount mismatch",
  "error": "Bad Request"
}
```

Esto previene manipulación de montos.

---

## Seguridad

### Validación de Signature

Todos los webhooks de Stripe **deben** incluir una signature válida:

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,        // Raw body del request
  signature,      // Header stripe-signature
  webhookSecret   // STRIPE_WEBHOOK_SECRET
);
```

Si la signature es inválida, se rechaza el webhook inmediatamente.

### HTTPS Requerido en Producción

Stripe **requiere HTTPS** para webhooks en producción:

- Desarrollo: `http://localhost` está permitido
- Producción: `https://your-domain.com` requerido

---

## Monitoreo y Logs

El sistema registra información detallada sobre cada pago:

```typescript
logger.log(`Webhook recibido: ${event.type} - ${event.id}`);
logger.log(`Pago exitoso procesado: ${payment.id} - Booking: ${bookingId}`);
logger.warn(`Evento duplicado detectado: ${event.id}`);
logger.error(`Amount mismatch: esperado ${expected}, recibido ${actual}`);
```

### Métricas Importantes

- Tiempo de procesamiento de webhooks
- Tasa de pagos exitosos vs fallidos
- Eventos duplicados detectados
- Mismatches de monto

---

## Ejemplos de Uso

### Flujo Completo (cURL)

```bash
# 1. Variables
TOKEN="your-jwt-token"
EVENT_ID="event-uuid-123"

# 2. Crear reserva
BOOKING=$(curl -s -X POST http://localhost:3000/api/v1/bookings/reserve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"quantity\":2}")

BOOKING_ID=$(echo $BOOKING | jq -r '.id')
echo "Booking ID: $BOOKING_ID"

# 3. Crear payment intent
PAYMENT=$(curl -s -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$BOOKING_ID\"}")

CLIENT_SECRET=$(echo $PAYMENT | jq -r '.clientSecret')
AMOUNT=$(echo $PAYMENT | jq -r '.amount')
echo "Client Secret: $CLIENT_SECRET"
echo "Amount: $AMOUNT cents"

# 4. Completar pago (frontend con Stripe.js)
# El webhook confirmará automáticamente la reserva

# 5. Verificar estado de la reserva
curl -s -X GET "http://localhost:3000/api/v1/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Webhooks en Producción

### Configuración Recomendada

1. **Timeout del Webhook:** 5-10 segundos
2. **Retries de Stripe:** 3 intentos automáticos
3. **Logs:** Almacenar todos los eventos recibidos
4. **Alertas:** Notificar si hay muchos webhooks fallando

### Monitoreo en Stripe Dashboard

Puedes ver el estado de todos los webhooks en:
`https://dashboard.stripe.com/webhooks/[webhook_id]`

Esto muestra:
- Eventos enviados exitosamente
- Eventos con errores
- Response time
- Response codes

---

## Códigos de Error HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Payment Intent creado o webhook procesado |
| 400 | Bad Request - Signature inválida, amount mismatch, o reserva expirada |
| 401 | Unauthorized - Token JWT inválido |
| 403 | Forbidden - No es owner de la reserva |
| 404 | Not Found - Reserva no encontrada |
| 500 | Internal Server Error - Error del servidor |

---

## Notas Importantes

- **Client Secret**: Nunca compartir en logs o código público
- **Webhook Secret**: Mantener seguro, rotar periódicamente
- **Raw Body**: El webhook **requiere** el raw body para validar signature
- **Idempotencia**: Webhooks pueden recibirse múltiples veces, siempre es seguro
- **Async Processing**: Los webhooks se procesan de forma asíncrona
- **Email Notifications**: Se envían automáticamente vía Bull Queue

---

## Recursos Adicionales

- [Stripe Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
