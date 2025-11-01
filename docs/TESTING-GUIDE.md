# Guía de Validación Manual - EventPass API

**Versión**: 1.0.0
**Fecha**: 2025-10-31
**Propósito**: Guía paso a paso para validar todos los endpoints y flujos del sistema

---

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Flujo 1: Configuración Inicial](#flujo-1-configuración-inicial)
3. [Flujo 2: Autenticación y Usuarios](#flujo-2-autenticación-y-usuarios)
4. [Flujo 3: Gestión de Eventos](#flujo-3-gestión-de-eventos)
5. [Flujo 4: Gestión de Venues y Sectores](#flujo-4-gestión-de-venues-y-sectores)
6. [Flujo 5: Sistema de Reservas](#flujo-5-sistema-de-reservas)
7. [Flujo 6: Pagos con Stripe](#flujo-6-pagos-con-stripe)
8. [Flujo 7: Asignación de Checkers](#flujo-7-asignación-de-checkers)
9. [Flujo 8: Escaneo de Tickets](#flujo-8-escaneo-de-tickets)
10. [Flujo 9: Notificaciones y Emails](#flujo-9-notificaciones-y-emails)
11. [Validación de Seguridad](#validación-de-seguridad)
12. [Checklist Final](#checklist-final)

---

## Requisitos Previos

### 1. Configuración del Entorno

```bash
# Verificar que el servidor está corriendo
curl http://localhost:3000/health

# Respuesta esperada:
{
  "status": "ok",
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### 2. Herramientas Necesarias

- **Postman** o **cURL** para hacer requests
- **Stripe CLI** para simular webhooks (opcional)
- **Redis** corriendo localmente
- **PostgreSQL** con base de datos configurada

### 3. Variables de Entorno

```bash
# Verificar que todas las variables están configuradas
cat .env | grep -v "^#" | grep -v "^$"
```

### 4. Acceder a Swagger

```
http://localhost:3000/api
```

---

## Flujo 1: Configuración Inicial

### 1.1. Verificar Health Check

```bash
curl http://localhost:3000/health
```

**Validar**:
- ✅ Status 200
- ✅ Respuesta contiene `status: "ok"`

### 1.2. Ejecutar Seeders (Primera vez)

```bash
npm run seed:admin
```

**Validar**:
- ✅ Super Admin creado: `superadmin@eventpass.com`
- ✅ Sin errores en consola

### 1.3. Verificar Swagger

```
http://localhost:3000/api
```

**Validar**:
- ✅ Documentación carga correctamente
- ✅ Todos los módulos visibles (Auth, Users, Events, Bookings, etc.)

---

## Flujo 2: Autenticación y Usuarios

### 2.1. Login como Super Admin

**Endpoint**: `POST /auth/login`

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@eventpass.com",
    "password": "SuperAdmin123!@#"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Recibir `accessToken` y `refreshToken`
- ✅ Usuario tiene rol `SUPER_ADMIN`

**Guardar**: `SUPER_ADMIN_TOKEN` para siguientes requests

### 2.2. Crear Usuario Admin

**Endpoint**: `POST /admin/users`

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eventpass.com",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "+56912345678",
    "role": "admin"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Usuario creado con rol `admin`
- ✅ Contraseña temporal generada automáticamente y retornada en la respuesta (campo `temporaryPassword`)
- ✅ `mustChangePassword: true`

**IMPORTANTE**: Guardar la `temporaryPassword` de la respuesta para el primer login

**Guardar**: `ADMIN_TEMP_PASSWORD`

### 2.3. Crear Usuario Organizador

**Endpoint**: `POST /admin/users`

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@eventpass.com",
    "firstName": "Event",
    "lastName": "Organizer",
    "phone": "+56987654321",
    "role": "organizador"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Usuario creado con rol `organizer`
- ✅ Contraseña temporal generada automáticamente
- ✅ `mustChangePassword: true`

**Guardar**: `ORGANIZER_ID` y `ORGANIZER_TEMP_PASSWORD` de la respuesta

### 2.4. Crear Usuario Checker

**Endpoint**: `POST /admin/users`

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "checker@eventpass.com",
    "firstName": "Ticket",
    "lastName": "Checker",
    "phone": "+56911223344",
    "role": "checker"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Usuario creado con rol `checker`
- ✅ Contraseña temporal generada automáticamente
- ✅ `mustChangePassword: true`

**Guardar**: `CHECKER_ID` y `CHECKER_TEMP_PASSWORD` de la respuesta

### 2.5. Crear Usuario Customer

**Endpoint**: `POST /auth/register`

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@eventpass.com",
    "password": "Customer123!@#",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Usuario creado con rol `CUSTOMER`
- ✅ Token de acceso recibido

**Guardar**: `CUSTOMER_TOKEN`

### 2.6. Login como Admin (Primera vez con contraseña temporal)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eventpass.com",
    "password": "<ADMIN_TEMP_PASSWORD>"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Recibir `accessToken` y `refreshToken`
- ✅ Usuario tiene `mustChangePassword: true`

**Guardar**: `ADMIN_TOKEN`

**IMPORTANTE**: El admin debe cambiar su contraseña en el primer login usando `PATCH /users/me/password`

### 2.7. Login como Organizador (Primera vez con contraseña temporal)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@eventpass.com",
    "password": "<ORGANIZER_TEMP_PASSWORD>"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Usuario tiene rol `organizer`
- ✅ Recibir `accessToken` y `refreshToken`
- ✅ `mustChangePassword: true`

**Guardar**: `ORGANIZER_TOKEN`

**IMPORTANTE**: Cambiar contraseña temporal antes de continuar

### 2.8. Login como Checker (Primera vez con contraseña temporal)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "checker@eventpass.com",
    "password": "<CHECKER_TEMP_PASSWORD>"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Usuario tiene rol `checker`
- ✅ Recibir `accessToken` y `refreshToken`
- ✅ `mustChangePassword: true`

**Guardar**: `CHECKER_TOKEN`

### 2.8a. Cambiar Contraseña Temporal

**Endpoint**: `PATCH /users/me/password`

```bash
curl -X PATCH http://localhost:3000/users/me/password \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "<CHECKER_TEMP_PASSWORD>",
    "newPassword": "Checker123!@#"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Contraseña actualizada
- ✅ `mustChangePassword` ahora es `false`

**Nota**: Repetir este proceso para admin y organizer si es necesario

### 2.9. Refresh Token

**Endpoint**: `POST /auth/refresh`

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN_FROM_LOGIN>"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Nuevo `accessToken` generado

### 2.10. Logout

**Endpoint**: `POST /auth/logout`

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN_FROM_LOGIN>"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Mensaje: "Logout exitoso. Tu sesión ha sido cerrada."
- ✅ Refresh token agregado a blacklist

### 2.11. Intentar Refresh con Token Invalidado

```bash
# Intentar usar el refresh token después del logout
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN_USADO_EN_LOGOUT>"
  }'
```

**Validar**:
- ✅ Status 401 Unauthorized
- ✅ Mensaje: "Token has been invalidated. Please login again."

### 2.12. Invalidación Global de Tokens (Solo SUPER_ADMIN)

**Endpoint**: `POST /admin/auth/invalidate-all-tokens`

**Propósito**: Esta funcionalidad permite al SUPER_ADMIN invalidar TODOS los tokens activos en el sistema de forma inmediata. Se usa en situaciones de emergencia o actualizaciones de seguridad críticas.

```bash
# Primero, hacer login con varios usuarios y guardar sus tokens
# Luego, como SUPER_ADMIN, invalidar todos los tokens

curl -X POST http://localhost:3000/admin/auth/invalidate-all-tokens \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Validar**:
- ✅ Status 200
- ✅ Mensaje: "Todos los tokens han sido invalidados. Los usuarios deberán iniciar sesión nuevamente."

**Ahora validar que todos los tokens anteriores están invalidados**:

```bash
# Intentar usar un access token que fue generado ANTES de la invalidación global
curl http://localhost:3000/bookings/my-bookings \
  -H "Authorization: Bearer $CUSTOMER_TOKEN_ANTERIOR"
```

**Validar**:
- ✅ Status 401 Unauthorized
- ✅ Mensaje: "Tu sesión ha sido invalidada por motivos de seguridad. Por favor, inicia sesión nuevamente."

```bash
# Intentar refresh con un token anterior
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN_ANTERIOR>"
  }'
```

**Validar**:
- ✅ Status 401 Unauthorized
- ✅ Token anterior no funciona

**Validar que el SUPER_ADMIN también debe volver a hacer login**:

```bash
# El token del SUPER_ADMIN también debe estar invalidado
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN_ANTERIOR"
```

**Validar**:
- ✅ Status 401 Unauthorized
- ✅ Incluso el SUPER_ADMIN debe hacer login nuevamente

**Hacer login nuevamente con cualquier usuario**:

```bash
# Después de la invalidación global, los usuarios pueden volver a hacer login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@eventpass.com",
    "password": "Customer123!@#"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Nuevos tokens generados
- ✅ Nuevos tokens funcionan correctamente

**Validar permisos - Solo SUPER_ADMIN puede invalidar todos los tokens**:

```bash
# Intentar como ADMIN (debe fallar)
curl -X POST http://localhost:3000/admin/auth/invalidate-all-tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Validar**:
- ✅ Status 403 Forbidden
- ✅ Mensaje: "User role 'admin' does not have permission to access this resource. Required roles: super-admin"

```bash
# Intentar como CUSTOMER (debe fallar)
curl -X POST http://localhost:3000/admin/auth/invalidate-all-tokens \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json"
```

**Validar**:
- ✅ Status 403 Forbidden
- ✅ Solo SUPER_ADMIN puede ejecutar esta operación

### 2.13. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@eventpass.com"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Email con token enviado (verificar logs)
- ✅ Rate limit: máximo 3 intentos/minuto

### 2.14. Rate Limiting - Login

```bash
# Intentar 6 logins rápidos con credenciales incorrectas
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "Attempt $i"
done
```

**Validar**:
- ✅ Primeros 5 intentos: 401 Unauthorized
- ✅ Intento 6: 429 Too Many Requests
- ✅ Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Flujo 3: Gestión de Eventos

### 3.1. Crear Evento

**Endpoint**: `POST /events`
**Rol**: ADMIN o SUPER_ADMIN

```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Concierto de Rock 2025",
    "description": "El mejor concierto del año",
    "startDate": "2025-12-01T20:00:00Z",
    "endDate": "2025-12-01T23:59:59Z",
    "location": "Estadio Nacional",
    "status": "DRAFT",
    "maxCapacity": 50000,
    "category": "CONCERT"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Evento creado con `status: "DRAFT"`
- ✅ `maxCapacity` establecido correctamente

**Guardar**: `EVENT_ID`

### 3.2. Listar Eventos (Público)

**Endpoint**: `GET /events`

```bash
curl http://localhost:3000/events
```

**Validar**:
- ✅ Status 200
- ✅ Solo eventos con `status: "PUBLISHED"` visibles
- ✅ Paginación funcionando

### 3.3. Obtener Detalle de Evento

**Endpoint**: `GET /events/:id`

```bash
curl http://localhost:3000/events/$EVENT_ID
```

**Validar**:
- ✅ Status 200
- ✅ Toda la información del evento
- ✅ Incluye venues y sectores si existen

### 3.4. Actualizar Evento

**Endpoint**: `PATCH /events/:id`

```bash
curl -X PATCH http://localhost:3000/events/$EVENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PUBLISHED"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Evento actualizado a `PUBLISHED`
- ✅ Ahora visible en listado público

### 3.5. Búsqueda de Eventos

**Endpoint**: `GET /events?search=Rock`

```bash
curl "http://localhost:3000/events?search=Rock"
```

**Validar**:
- ✅ Status 200
- ✅ Resultados filtrados por búsqueda
- ✅ Full-text search funcionando

### 3.6. Filtrar por Categoría

```bash
curl "http://localhost:3000/events?category=CONCERT"
```

**Validar**:
- ✅ Solo eventos de categoría `CONCERT`

### 3.7. Filtrar por Fechas

```bash
curl "http://localhost:3000/events?startDate=2025-12-01&endDate=2025-12-31"
```

**Validar**:
- ✅ Eventos dentro del rango de fechas

---

## Flujo 4: Gestión de Venues y Sectores

### 4.1. Crear Venue

**Endpoint**: `POST /events/:eventId/venues`

```bash
curl -X POST http://localhost:3000/events/$EVENT_ID/venues \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platea Principal",
    "capacity": 5000,
    "description": "Zona principal del estadio"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Venue creado y asociado al evento

**Guardar**: `VENUE_ID`

### 4.2. Crear Sectores en Venue

**Endpoint**: `POST /events/:eventId/venues/:venueId/sectors`

```bash
# Sector VIP
curl -X POST http://localhost:3000/events/$EVENT_ID/venues/$VENUE_ID/sectors \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP",
    "capacity": 500,
    "price": 150.00
  }'

# Sector General
curl -X POST http://localhost:3000/events/$EVENT_ID/venues/$VENUE_ID/sectors \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General",
    "capacity": 4500,
    "price": 50.00
  }'
```

**Validar**:
- ✅ Status 201 para ambos
- ✅ Capacidad total de sectores ≤ capacidad del venue

**Guardar**: `SECTOR_VIP_ID` y `SECTOR_GENERAL_ID`

### 4.3. Listar Venues de un Evento

```bash
curl http://localhost:3000/events/$EVENT_ID/venues
```

**Validar**:
- ✅ Lista todos los venues del evento
- ✅ Incluye sectores de cada venue

### 4.4. Actualizar Capacidad de Sector

```bash
curl -X PATCH http://localhost:3000/events/$EVENT_ID/venues/$VENUE_ID/sectors/$SECTOR_VIP_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "capacity": 600
  }'
```

**Validar**:
- ✅ Capacidad actualizada
- ✅ Validación: no permitir capacidad mayor al venue

---

## Flujo 5: Sistema de Reservas

### 5.1. Crear Reserva como Customer

**Endpoint**: `POST /bookings`

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "'"$EVENT_ID"'",
    "sectorId": "'"$SECTOR_VIP_ID"'",
    "quantity": 2
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Reserva creada con `status: "PENDING"`
- ✅ Tiempo de expiración: 10 minutos desde creación
- ✅ Capacidad disponible reducida

**Guardar**: `BOOKING_ID`

### 5.2. Verificar Reserva

**Endpoint**: `GET /bookings/:id`

```bash
curl http://localhost:3000/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Validar**:
- ✅ Detalle completo de la reserva
- ✅ Incluye información de evento, sector, y tickets

### 5.3. Listar Mis Reservas

**Endpoint**: `GET /bookings/my-bookings`

```bash
curl http://localhost:3000/bookings/my-bookings \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Validar**:
- ✅ Lista todas las reservas del usuario
- ✅ Filtros por status funcionando

### 5.4. Intentar Crear Reserva sin Capacidad

```bash
# Intentar reservar más tickets de los disponibles
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "'"$EVENT_ID"'",
    "sectorId": "'"$SECTOR_VIP_ID"'",
    "quantity": 99999
  }'
```

**Validar**:
- ✅ Status 400 Bad Request
- ✅ Mensaje: "Capacidad insuficiente"

### 5.5. Expiración de Reserva

**Esperar 10+ minutos o modificar variable de entorno**

```bash
# Verificar que el job de limpieza expira la reserva
curl http://localhost:3000/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Validar**:
- ✅ Status de reserva cambia a `EXPIRED`
- ✅ Capacidad liberada
- ✅ Logs muestran ejecución del job

---

## Flujo 6: Pagos con Stripe

### 6.1. Iniciar Pago

**Endpoint**: `POST /payments/create-payment-intent`

```bash
curl -X POST http://localhost:3000/payments/create-payment-intent \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "'"$BOOKING_ID"'"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Recibir `clientSecret` de Stripe
- ✅ `paymentIntentId` generado

**Guardar**: `PAYMENT_INTENT_ID`

### 6.2. Simular Webhook de Stripe - Pago Exitoso

**Usar Stripe CLI**:

```bash
stripe trigger payment_intent.succeeded \
  --add payment_intent:id=$PAYMENT_INTENT_ID
```

**O cURL directo**:

```bash
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "'"$PAYMENT_INTENT_ID"'",
        "status": "succeeded",
        "metadata": {
          "bookingId": "'"$BOOKING_ID"'"
        }
      }
    }
  }'
```

**Validar**:
- ✅ Reserva cambia a `CONFIRMED`
- ✅ Tickets generados con códigos únicos
- ✅ Email con tickets enviado al customer
- ✅ Capacidad actualizada permanentemente

### 6.3. Verificar Tickets Generados

**Endpoint**: `GET /bookings/:id`

```bash
curl http://localhost:3000/bookings/$BOOKING_ID \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Validar**:
- ✅ Tickets incluidos en la respuesta
- ✅ Cada ticket tiene código único (formato: `TKT-XXXXX`)
- ✅ Status de tickets: `AVAILABLE`

**Guardar**: `TICKET_CODE` de uno de los tickets

### 6.4. Simular Webhook - Pago Fallido

```bash
# Crear otra reserva y simular fallo
stripe trigger payment_intent.payment_failed \
  --add payment_intent:id=$PAYMENT_INTENT_ID_2
```

**Validar**:
- ✅ Reserva cambia a `CANCELLED`
- ✅ Capacidad liberada
- ✅ Email de fallo enviado

---

## Flujo 7: Asignación de Checkers

### 7.1. Asignar Checker a Evento

**Endpoint**: `POST /checker-assignments`

```bash
curl -X POST http://localhost:3000/checker-assignments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkerId": "'"$CHECKER_ID"'",
    "eventId": "'"$EVENT_ID"'",
    "venueId": "'"$VENUE_ID"'",
    "sectorId": "'"$SECTOR_VIP_ID"'"
  }'
```

**Validar**:
- ✅ Status 201
- ✅ Asignación creada con `status: "ACTIVE"`
- ✅ Checker puede escanear tickets en ese sector

**Guardar**: `ASSIGNMENT_ID`

### 7.2. Listar Asignaciones de un Checker

**Endpoint**: `GET /checker-assignments/my-assignments`

```bash
curl http://localhost:3000/checker-assignments/my-assignments \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Validar**:
- ✅ Lista todas las asignaciones del checker
- ✅ Solo asignaciones activas

### 7.3. Desactivar Asignación

**Endpoint**: `PATCH /checker-assignments/:id`

```bash
curl -X PATCH http://localhost:3000/checker-assignments/$ASSIGNMENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "INACTIVE"
  }'
```

**Validar**:
- ✅ Asignación desactivada
- ✅ Checker ya no puede escanear en ese sector

### 7.4. Verificar Permisos de Escaneo

```bash
# Intentar escanear sin asignación activa
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE"'",
    "eventId": "'"$EVENT_ID"'",
    "venueId": "'"$VENUE_ID"'",
    "sectorId": "'"$SECTOR_VIP_ID"'"
  }'
```

**Validar**:
- ✅ Status 403 Forbidden (si no hay asignación activa)
- ✅ Mensaje: "No tienes permisos para escanear en este sector"

**Reactivar la asignación para continuar**

---

## Flujo 8: Escaneo de Tickets

### 8.1. Escaneo Exitoso

**Endpoint**: `POST /ticket-scan/scan`

```bash
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE"'",
    "eventId": "'"$EVENT_ID"'",
    "venueId": "'"$VENUE_ID"'",
    "sectorId": "'"$SECTOR_VIP_ID"'"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Response: `status: "VALID"`
- ✅ Mensaje: "Entrada permitida. ¡Bienvenido!"
- ✅ Ticket status cambia a `USED`
- ✅ `usedAt` timestamp registrado
- ✅ Audit log creado

### 8.2. Intentar Re-escanear (Ticket Ya Usado)

```bash
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE"'",
    "eventId": "'"$EVENT_ID"'"
  }'
```

**Validar**:
- ✅ Status 200
- ✅ Response: `status: "ALREADY_USED"`
- ✅ Mensaje: "Ticket ya utilizado"
- ✅ Información de cuándo y por quién fue escaneado

### 8.3. Validar Idempotencia

```bash
# Guardar el Idempotency-Key
IDEMPOTENCY_KEY=$(uuidgen)

# Primer request
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE_2"'",
    "eventId": "'"$EVENT_ID"'"
  }'

# Segundo request con mismo Idempotency-Key
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE_2"'",
    "eventId": "'"$EVENT_ID"'"
  }'
```

**Validar**:
- ✅ Ambos requests retornan la misma respuesta
- ✅ Ticket solo marcado como usado una vez
- ✅ Cache funcionando (24 horas)

### 8.4. Escaneo sin Idempotency-Key

```bash
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'"$TICKET_CODE"'",
    "eventId": "'"$EVENT_ID"'"
  }'
```

**Validar**:
- ✅ Status 400 Bad Request
- ✅ Mensaje: "Idempotency-Key header is required"

### 8.5. Rate Limiting en Scan

```bash
# Intentar 12 escaneos rápidos
for i in {1..12}; do
  curl -X POST http://localhost:3000/ticket-scan/scan \
    -H "Authorization: Bearer $CHECKER_TOKEN" \
    -H "Idempotency-Key: key-$i" \
    -H "Content-Type: application/json" \
    -d '{"code":"TKT-TEST","eventId":"'"$EVENT_ID"'"}'
  echo "Scan attempt $i"
done
```

**Validar**:
- ✅ Primeros 10: Responses normales
- ✅ Intentos 11-12: 429 Too Many Requests
- ✅ Headers de rate limit presentes

### 8.6. Obtener Historial de Escaneos

**Endpoint**: `GET /ticket-scan/my-scans`

```bash
curl http://localhost:3000/ticket-scan/my-scans \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Validar**:
- ✅ Lista todos los escaneos del checker
- ✅ Incluye válidos y rechazados

### 8.7. Filtrar Historial por Evento

```bash
curl "http://localhost:3000/ticket-scan/my-scans?eventId=$EVENT_ID" \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Validar**:
- ✅ Solo escaneos de ese evento

### 8.8. Obtener Estadísticas del Checker

**Endpoint**: `GET /ticket-scan/events/:eventId/stats`

```bash
curl http://localhost:3000/ticket-scan/events/$EVENT_ID/stats \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Validar**:
- ✅ Total de escaneos
- ✅ Escaneos válidos vs rechazados
- ✅ Tasa de éxito

### 8.9. Consultar Ocupación de Venue (Real-time)

**Endpoint**: `GET /ticket-scan/venue-occupancy/:eventId/:venueId`

```bash
curl http://localhost:3000/ticket-scan/venue-occupancy/$EVENT_ID/$VENUE_ID \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Validar**:
- ✅ Capacidad total
- ✅ Ocupación actual
- ✅ Porcentaje de ocupación
- ✅ Capacidad disponible

### 8.10. Server-Sent Events (SSE) - Ocupación en Tiempo Real

**Abrir conexión SSE**:

```bash
curl -N http://localhost:3000/ticket-scan/occupancy-updates/$EVENT_ID \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**En otra terminal, escanear tickets**:

```bash
curl -X POST http://localhost:3000/ticket-scan/scan \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"code":"'"$TICKET_CODE_3"'","eventId":"'"$EVENT_ID"'"}'
```

**Validar en la terminal de SSE**:
- ✅ Evento recibido con ocupación actualizada
- ✅ Formato SSE correcto: `data: {...}`

---

## Flujo 9: Notificaciones y Emails

### 9.1. Verificar Logs de Emails

```bash
# Ver últimos emails enviados
tail -f logs/app.log | grep "Email sent successfully"
```

**Validar que se enviaron emails en**:
- ✅ Registro de usuario
- ✅ Confirmación de pago
- ✅ Envío de tickets
- ✅ Fallo de pago
- ✅ Reset de contraseña

### 9.2. Email de Tickets

**Trigger**: Pago exitoso

**Validar**:
- ✅ Email enviado al customer
- ✅ Contiene todos los códigos de tickets
- ✅ Incluye QR codes (si implementado)
- ✅ Información del evento completa

### 9.3. Email de Bienvenida

**Trigger**: Crear usuario desde registro

**Validar**:
- ✅ Email enviado
- ✅ Personalizado con nombre del usuario

---

## Validación de Seguridad

### 10.1. Invalidación Global de Tokens

**Ver sección [2.12. Invalidación Global de Tokens](#212-invalidación-global-de-tokens-solo-super_admin)** para pruebas detalladas de esta funcionalidad crítica de seguridad.

**Resumen**: El SUPER_ADMIN puede invalidar todos los tokens activos del sistema en casos de emergencia o actualizaciones de seguridad.

### 10.2. Protección de Rutas - Sin Token

```bash
# Intentar acceder a ruta protegida sin token
curl http://localhost:3000/bookings/my-bookings
```

**Validar**:
- ✅ Status 401 Unauthorized

### 10.3. Protección de Rutas - Token Inválido

```bash
curl http://localhost:3000/bookings/my-bookings \
  -H "Authorization: Bearer invalid_token_12345"
```

**Validar**:
- ✅ Status 401 Unauthorized

### 10.4. Protección de Rutas - Rol Insuficiente

```bash
# Customer intentando acceder a ruta de Admin
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

**Validar**:
- ✅ Status 403 Forbidden

### 10.5. Validación de CORS

```bash
curl -H "Origin: http://evil-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:3000/auth/login
```

**Validar**:
- ✅ Solo dominios permitidos en `ALLOWED_ORIGINS`

### 10.6. SQL Injection Protection

```bash
# Intentar inyección SQL en búsqueda
curl "http://localhost:3000/events?search='; DROP TABLE users;--"
```

**Validar**:
- ✅ No hay error
- ✅ Query sanitizado
- ✅ Base de datos intacta

### 10.7. Rate Limiting Global

```bash
# Hacer 101+ requests rápidos
for i in {1..105}; do
  curl http://localhost:3000/health
done
```

**Validar**:
- ✅ Request 101+: 429 Too Many Requests

### 10.8. Password Hashing

**Verificar en base de datos**:

```sql
SELECT email, password FROM users WHERE email = 'customer@eventpass.com';
```

**Validar**:
- ✅ Password NO está en texto plano
- ✅ Hash bcrypt (empieza con `$2b$`)

---

## Checklist Final

### ✅ Autenticación y Autorización

- [ ] Login funciona para todos los roles
- [ ] Refresh token funciona
- [ ] Forgot password envía email
- [ ] Rate limiting en login funciona (5/min)
- [ ] Rate limiting en forgot password funciona (3/min)
- [ ] JWT expira correctamente
- [ ] Roles restringen acceso apropiadamente

### ✅ Gestión de Eventos

- [ ] CRUD de eventos funciona
- [ ] Solo eventos `PUBLISHED` visibles públicamente
- [ ] Búsqueda full-text funciona
- [ ] Filtros (categoría, fechas) funcionan
- [ ] Validaciones de capacidad funcionan

### ✅ Venues y Sectores

- [ ] Crear venues y sectores funciona
- [ ] Validación de capacidad (sectores ≤ venue)
- [ ] Precios por sector funcionan
- [ ] Actualización de capacidad funciona

### ✅ Sistema de Reservas

- [ ] Crear reserva funciona
- [ ] Tiempo de expiración (10 min) funciona
- [ ] Job de limpieza expira reservas automáticamente
- [ ] Validación de capacidad disponible
- [ ] Concurrencia manejada (múltiples reservas simultáneas)

### ✅ Pagos con Stripe

- [ ] Payment intent se crea correctamente
- [ ] Webhook de pago exitoso procesa correctamente
- [ ] Tickets generados con códigos únicos
- [ ] Email de tickets enviado
- [ ] Webhook de pago fallido cancela reserva
- [ ] Capacidad actualizada correctamente

### ✅ Asignaciones de Checkers

- [ ] Asignar checker a evento/venue/sector funciona
- [ ] Checker puede ver sus asignaciones
- [ ] Validación de permisos antes de escanear
- [ ] Desactivar asignación funciona

### ✅ Escaneo de Tickets

- [ ] Escaneo exitoso marca ticket como `USED`
- [ ] Re-escaneo rechazado con mensaje apropiado
- [ ] Idempotencia funciona (mismo Idempotency-Key = misma respuesta)
- [ ] Rate limiting (10/min) funciona
- [ ] Historial de escaneos registrado
- [ ] Estadísticas del checker correctas
- [ ] Ocupación de venue en tiempo real funciona
- [ ] SSE para ocupación funciona
- [ ] Audit logs creados correctamente

### ✅ Seguridad

- [ ] Rate limiting global (100/min) funciona
- [ ] CORS configurado correctamente
- [ ] Passwords hasheados con bcrypt
- [ ] SQL injection protegido
- [ ] XSS protegido
- [ ] Tokens JWT firmados y validados
- [ ] Roles y permisos funcionan

### ✅ Notificaciones

- [ ] Email de bienvenida
- [ ] Email de reset de contraseña
- [ ] Email de tickets confirmados
- [ ] Email de pago fallido
- [ ] Logs de emails funcionando

### ✅ Performance y Escalabilidad

- [ ] Redis cache funcionando
- [ ] Database pool configurado
- [ ] Paginación en listados funciona
- [ ] Queries optimizadas (verificar con logs)

---

## Troubleshooting Común

### Error: "Cannot connect to Redis"

```bash
# Verificar que Redis está corriendo
redis-cli ping
# Debe responder: PONG
```

### Error: "SMTP connection failed"

- Verificar variables de entorno de email
- Si es Gmail, usar App Password

### Error: "Database connection failed"

```bash
# Verificar PostgreSQL
psql -U postgres -c "SELECT 1;"
```

### Error: "Stripe webhook signature invalid"

- En desarrollo, usar Stripe CLI
- Verificar `STRIPE_WEBHOOK_SECRET` en .env

### Reservas no expiran

```bash
# Verificar que el job está corriendo
# Ver logs de JobsService
tail -f logs/app.log | grep "Expired bookings cleaned"
```

---

## Documentos Relacionados

- [TICKET-SCAN.md](./TICKET-SCAN.md) - Documentación completa de ticket scan
- [CHECKER.md](./CHECKER.md) - Rol y permisos de checkers
- [CHECKER-ASSIGNMENTS.md](./CHECKER-ASSIGNMENTS.md) - Sistema de asignaciones
- [RATE-LIMITING.md](./RATE-LIMITING.md) - Configuración de rate limiting

---

## Notas Finales

- **Tiempo estimado de validación completa**: 2-3 horas
- **Recomendación**: Validar en orden secuencial
- **Automatización**: Considerar crear scripts de Postman/Newman para CI/CD
- **Logs**: Monitorear `logs/app.log` durante toda la validación

---

**Última actualización**: 2025-10-31
**Versión**: 1.0.0
