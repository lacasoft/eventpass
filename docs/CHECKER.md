# Rol CHECKER - Documentación Completa

## Descripción General

El rol **CHECKER** es un rol especializado en EventPass diseñado para personal de control de acceso en eventos. Los usuarios con este rol tienen permisos limitados específicamente para operaciones de validación de tickets en recintos asignados.

---

## Características del Rol

### Identificador
```typescript
UserRole.CHECKER = 'checker'
```

### Propósito
- Escanear y validar tickets en eventos asignados
- Controlar acceso a recintos y sectores
- Registrar asistencia de participantes
- Monitorear ocupación en tiempo real

### Nivel de Permisos
- **Nivel**: Operativo (bajo privilegio)
- **Alcance**: Limitado a eventos/recintos específicamente asignados
- **Seguridad**: No tiene acceso a datos sensibles ni operaciones administrativas

---

## Creación de Usuarios CHECKER

Los usuarios CHECKER **NO** pueden auto-registrarse. Deben ser creados por administradores.

### Endpoint de Creación

```bash
POST /api/v1/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "checker@eventpass.com",
  "password": "SecurePassword123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "checker"
}
```

### Requisitos

- ✅ Solo usuarios `admin` o `super_admin` pueden crear CHECKERs
- ✅ Email único en el sistema
- ✅ Contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas, números, caracteres especiales)
- ✅ Rol debe ser explícitamente `"checker"`

---

## Asignación a Eventos

Antes de poder escanear tickets, un CHECKER debe ser asignado a un evento y opcionalmente a recintos específicos.

### Endpoint de Asignación

```bash
POST /api/v1/checker-assignments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "checkerId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "venueId": "550e8400-e29b-41d4-a716-446655440002",
  "isActive": true,
  "notes": "Entrada principal - Turno mañana"
}
```

### Tipos de Asignación

#### 1. Asignación Global al Evento
```json
{
  "checkerId": "uuid-checker",
  "eventId": "uuid-event",
  "isActive": true
}
```
→ Checker puede escanear en cualquier recinto del evento

#### 2. Asignación Específica a Recinto
```json
{
  "checkerId": "uuid-checker",
  "eventId": "uuid-event",
  "venueId": "uuid-venue",
  "isActive": true
}
```
→ Checker solo puede escanear en el recinto especificado

---

## Permisos y Restricciones

### ✅ Operaciones Permitidas

#### 1. Autenticación
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
```

#### 2. Escaneo de Tickets
```
POST /api/v1/ticket-scan/scan
```
- Validar tickets
- Registrar asistencia
- Ver resultado de validación

#### 3. Consultas de Asistencia
```
GET /api/v1/ticket-scan/my-scan-history
GET /api/v1/ticket-scan/my-scan-history?eventId=xxx
```
- Ver historial de escaneos propios
- Filtrar por evento

#### 4. Estadísticas Personales
```
GET /api/v1/ticket-scan/event-stats/:eventId
```
- Ver total de escaneos realizados
- Ver tasa de éxito
- Ver escaneos válidos vs rechazados

#### 5. Ocupación de Recintos
```
GET /api/v1/ticket-scan/venue-occupancy/:eventId/:venueId
```
- Ver capacidad actual
- Ver porcentaje de ocupación
- Monitorear aforo

#### 6. Eventos en Tiempo Real
```
GET /api/v1/ticket-scan/occupancy-updates/:eventId (SSE)
```
- Recibir actualizaciones de ocupación
- Monitorear escaneos en tiempo real

#### 7. Asignaciones Propias
```
GET /api/v1/checker-assignments/my-assignments
GET /api/v1/checker-assignments/my-assignments?eventId=xxx
```
- Ver eventos asignados
- Ver recintos asignados

### ❌ Operaciones Prohibidas

Los CHECKERs **NO** tienen acceso a:

#### Gestión de Usuarios
```
❌ GET /api/v1/users
❌ POST /api/v1/admin/users
❌ PATCH /api/v1/admin/users/:id
❌ DELETE /api/v1/admin/users/:id
```

#### Gestión de Eventos
```
❌ POST /api/v1/events
❌ PATCH /api/v1/events/:id
❌ DELETE /api/v1/events/:id
```

#### Gestión de Recintos
```
❌ POST /api/v1/venues
❌ PATCH /api/v1/venues/:id
❌ DELETE /api/v1/venues/:id
```

#### Reservas y Pagos
```
❌ POST /api/v1/bookings/reserve
❌ GET /api/v1/bookings
❌ POST /api/v1/payments
❌ GET /api/v1/payments
```

#### Analíticas
```
❌ GET /api/v1/analytics/events/:id
❌ GET /api/v1/analytics/revenue
❌ GET /api/v1/analytics/venues/:id
```

#### Asignaciones de Otros Checkers
```
❌ GET /api/v1/checker-assignments (todas)
❌ POST /api/v1/checker-assignments
❌ PATCH /api/v1/checker-assignments/:id
❌ DELETE /api/v1/checker-assignments/:id
```

---

## Flujo de Trabajo Típico

### 1. Inicio de Turno

```bash
# 1. Checker hace login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "checker@eventpass.com",
    "password": "SecurePassword123!"
  }'

# Respuesta incluye token
{
  "user": {
    "id": "checker-uuid",
    "email": "checker@eventpass.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "checker"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Verificar Asignaciones

```bash
# 2. Ver eventos asignados hoy
curl -X GET http://localhost:3000/api/v1/checker-assignments/my-assignments \
  -H "Authorization: Bearer <token>"

# Respuesta
[
  {
    "id": "assignment-uuid",
    "eventId": "event-uuid",
    "eventName": "Concierto Rock 2025",
    "venueId": "venue-uuid",
    "venueName": "Entrada Principal",
    "isActive": true,
    "assignedAt": "2025-10-31T08:00:00.000Z"
  }
]
```

### 3. Escanear Tickets Durante el Evento

```bash
# 3. Escanear cada ticket que llega
curl -X POST http://localhost:3000/api/v1/ticket-scan/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "code": "TKT-ABC123-XYZ789",
    "eventId": "event-uuid",
    "venueId": "venue-uuid"
  }'
```

### 4. Monitorear Ocupación

```bash
# 4. Consultar ocupación actual
curl -X GET http://localhost:3000/api/v1/ticket-scan/venue-occupancy/event-uuid/venue-uuid \
  -H "Authorization: Bearer <token>"

# Respuesta
{
  "eventId": "event-uuid",
  "venueId": "venue-uuid",
  "capacity": 1000,
  "currentOccupancy": 756,
  "occupancyPercentage": 75.60,
  "availableCapacity": 244
}
```

### 5. Fin de Turno - Ver Estadísticas

```bash
# 5. Ver estadísticas del turno
curl -X GET http://localhost:3000/api/v1/ticket-scan/event-stats/event-uuid \
  -H "Authorization: Bearer <token>"

# Respuesta
{
  "eventId": "event-uuid",
  "checkerId": "checker-uuid",
  "totalScans": 156,
  "validScans": 149,
  "rejectedScans": 7,
  "successRate": 95.51
}
```

---

## Casos de Uso

### Caso 1: Entrada Principal de Evento Masivo

**Contexto**: Concierto con 10,000 asistentes, 5 checkers en entrada principal.

**Setup**:
```bash
# Admin crea 5 checkers
for i in {1..5}; do
  curl -X POST /api/v1/admin/users \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"email\": \"checker${i}@eventpass.com\",
      \"password\": \"Secure123!\",
      \"firstName\": \"Checker\",
      \"lastName\": \"${i}\",
      \"role\": \"checker\"
    }"
done

# Admin asigna todos al evento, entrada principal
for checker_id in "${CHECKER_IDS[@]}"; do
  curl -X POST /api/v1/checker-assignments \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"checkerId\": \"${checker_id}\",
      \"eventId\": \"${EVENT_ID}\",
      \"venueId\": \"${MAIN_ENTRANCE_ID}\",
      \"isActive\": true
    }"
done
```

**Operación**:
- Cada checker escanea tickets con su propia app móvil
- Sistema previene doble escaneo con idempotencia
- Rate limiting permite hasta 10 escaneos/minuto por checker
- Todos ven ocupación en tiempo real

### Caso 2: Festival Multi-Recinto

**Contexto**: Festival con 3 recintos (Principal, VIP, BackStage), 10 checkers.

**Setup**:
```bash
# Distribuir checkers por recinto
# 6 checkers → Entrada Principal
# 3 checkers → Entrada VIP
# 1 checker  → BackStage

# Principal
curl -X POST /api/v1/checker-assignments -d '{
  "checkerId": "checker-1",
  "eventId": "festival-id",
  "venueId": "principal-id",
  "isActive": true
}'

# VIP
curl -X POST /api/v1/checker-assignments -d '{
  "checkerId": "checker-7",
  "eventId": "festival-id",
  "venueId": "vip-id",
  "isActive": true
}'

# BackStage (sin restricción de venue = puede ir a cualquier lado)
curl -X POST /api/v1/checker-assignments -d '{
  "checkerId": "checker-10",
  "eventId": "festival-id",
  "isActive": true
}'
```

**Validación**:
- Checker en Principal solo puede escanear tickets de Principal
- Checker en VIP solo puede escanear tickets VIP
- Checker de BackStage puede escanear en cualquier recinto
- Sistema valida automáticamente el venue del ticket vs venue del checker

### Caso 3: Evento con Múltiples Sectores

**Contexto**: Estadio con sectores numerados (A1-A10, B1-B10, etc.)

**Escaneo con Validación de Sector**:
```bash
# Checker en Sector A-5
curl -X POST /api/v1/ticket-scan/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "code": "TKT-ABC123",
    "eventId": "estadio-event",
    "venueId": "estadio-id",
    "sectorId": "A-5"
  }'

# Si el ticket es de otro sector, el sistema rechaza:
{
  "status": "WRONG_SECTOR",
  "message": "El ticket no corresponde a este sector"
}
```

---

## Aplicación Móvil para CHECKERs

### Funcionalidades Recomendadas

1. **Scanner QR**
   - Usar cámara del dispositivo
   - Escaneo rápido de códigos QR
   - Generación automática de Idempotency-Key
   - Feedback visual inmediato (verde/rojo)

2. **Dashboard de Turno**
   - Escaneos realizados hoy
   - Tasa de éxito
   - Ocupación actual del recinto
   - Último escaneo (timestamp)

3. **Modo Offline**
   - Queue de escaneos pendientes
   - Sincronización cuando hay conexión
   - Alerta visual de modo offline

4. **Historial Local**
   - Últimos 50 escaneos en cache
   - Búsqueda por código de ticket
   - Exportar a CSV

### Ejemplo de Implementación (React Native)

```typescript
// CheckerScanScreen.tsx
import React, { useState } from 'react';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { v4 as uuidv4 } from 'uuid';

function CheckerScanScreen() {
  const [scanning, setScanning] = useState(true);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);

    try {
      const response = await fetch(`${API_URL}/ticket-scan/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': uuidv4(), // Único por escaneo
        },
        body: JSON.stringify({
          code: data,
          eventId: currentEvent.id,
          venueId: currentVenue.id,
        }),
      });

      const result = await response.json();

      if (result.status === 'VALID') {
        showSuccess('✅ Entrada permitida');
        playSuccessSound();
      } else {
        showError(`❌ ${result.message}`);
        playErrorSound();
      }
    } catch (error) {
      showError('Error de conexión');
    } finally {
      // Permitir siguiente escaneo después de 1 segundo
      setTimeout(() => setScanning(true), 1000);
    }
  };

  return (
    <BarCodeScanner
      onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
      style={{ flex: 1 }}
    />
  );
}
```

---

## Seguridad

### Mejores Prácticas

1. **Contraseñas Seguras**
   ```
   ✅ Correcto: "Checker2025!@Main"
   ❌ Incorrecto: "12345678"
   ```

2. **Rotación de Credenciales**
   - Cambiar contraseñas cada 3 meses
   - Usar contraseñas únicas por evento importante
   - No compartir credenciales entre checkers

3. **Tokens JWT**
   - Duración: 24 horas (configurable)
   - Refresh token: 7 días
   - Invalidar tokens al fin de evento

4. **Dispositivos**
   - Solo dispositivos corporativos aprobados
   - Activar bloqueo de pantalla
   - Habilitar localización para auditoría

5. **Monitoreo**
   - Admin debe revisar logs de CHECKERs diariamente
   - Alertar si un CHECKER escanea fuera de su recinto asignado
   - Detectar patrones anormales (ej: 20 rechazos seguidos)

### Auditoría

Todos los escaneos quedan registrados con:
```typescript
{
  eventType: 'TICKET_SCAN_VALID',
  userId: 'checker-uuid',
  severity: 'LOW',
  details: {
    ticketCode: 'TKT-ABC123',
    eventId: 'event-uuid',
    venueId: 'venue-uuid',
    scanStatus: 'VALID'
  },
  ipAddress: '192.168.1.100',
  userAgent: 'EventPassMobile/1.0',
  timestamp: '2025-10-31T13:00:00.000Z'
}
```

---

## Gestión de CHECKERs (Para Administradores)

### Crear Checker

```bash
POST /api/v1/admin/users
Authorization: Bearer <admin_token>

{
  "email": "nuevo.checker@eventpass.com",
  "password": "SecurePass123!",
  "firstName": "María",
  "lastName": "González",
  "role": "checker"
}
```

### Asignar a Evento

```bash
POST /api/v1/checker-assignments

{
  "checkerId": "checker-uuid",
  "eventId": "event-uuid",
  "venueId": "venue-uuid", // Opcional
  "isActive": true,
  "notes": "Turno tarde 14:00-22:00"
}
```

### Desactivar Checker en Evento

```bash
PATCH /api/v1/checker-assignments/assignment-uuid

{
  "isActive": false
}
```

### Reasignar a Otro Recinto

```bash
# 1. Desactivar asignación actual
PATCH /api/v1/checker-assignments/old-assignment-uuid
{ "isActive": false }

# 2. Crear nueva asignación
POST /api/v1/checker-assignments
{
  "checkerId": "checker-uuid",
  "eventId": "event-uuid",
  "venueId": "new-venue-uuid",
  "isActive": true
}
```

### Ver Estadísticas de Checker

```bash
GET /api/v1/checker-assignments/checker-uuid/assignments
GET /api/v1/ticket-scan/event-stats/event-uuid?checkerId=checker-uuid
```

---

## Troubleshooting

### Problema: "No tienes permiso para escanear tickets de este evento"

**Causa**: Checker no está asignado al evento.

**Solución**:
```bash
# Admin verifica asignaciones
GET /api/v1/checker-assignments?checkerId=xxx

# Si no tiene asignación, crearla
POST /api/v1/checker-assignments
```

### Problema: "El ticket no corresponde a este recinto"

**Causa**: Checker está intentando escanear en un recinto al que no está asignado, o el ticket es de otro recinto.

**Solución**:
1. Verificar que el ticket sea del recinto correcto
2. Si el checker está en el recinto equivocado, redirigir al participante
3. Si debe poder escanear en múltiples recintos, actualizar asignación sin `venueId`

### Problema: "Too Many Requests" (429)

**Causa**: Rate limit excedido (más de 10 escaneos por minuto).

**Solución**:
- Esperar 60 segundos
- Verificar que la app no esté haciendo retry automático excesivo
- Si es necesario para eventos masivos, contactar admin para aumentar límite

### Problema: Token expiró

**Causa**: Token JWT venció (24 horas por defecto).

**Solución**:
```bash
# Usar refresh token para obtener nuevo access token
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

---

## Métricas y KPIs

### Indicadores de Desempeño

Para medir eficiencia de CHECKERs:

1. **Tasa de Éxito**
   ```
   Success Rate = (validScans / totalScans) * 100
   Target: > 90%
   ```

2. **Velocidad de Escaneo**
   ```
   Avg Time per Scan = totalTime / totalScans
   Target: < 5 segundos
   ```

3. **Rechazos por Hora**
   ```
   Rejection Rate = (rejectedScans / totalScans) * 100
   Target: < 10%
   ```

4. **Cobertura de Horario**
   ```
   Coverage = hoursWithActiveChecker / totalEventHours
   Target: 100%
   ```

### Dashboard para Supervisores

```sql
-- Query para estadísticas en tiempo real
SELECT
  u.firstName || ' ' || u.lastName as checker_name,
  COUNT(*) as total_scans,
  SUM(CASE WHEN ar.scanStatus = 'VALID' THEN 1 ELSE 0 END) as valid_scans,
  ROUND(
    SUM(CASE WHEN ar.scanStatus = 'VALID' THEN 1 ELSE 0 END)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate
FROM attendance_records ar
JOIN users u ON ar.checkerId = u.id
WHERE ar.eventId = 'event-uuid'
  AND ar.scannedAt >= NOW() - INTERVAL '1 day'
GROUP BY u.id, u.firstName, u.lastName
ORDER BY total_scans DESC;
```

---

## Changelog

### v1.0.0 (2025-10-31)

**Features Iniciales:**
- ✅ Rol CHECKER implementado
- ✅ Sistema de asignaciones a eventos
- ✅ Escaneo de tickets con validación multinivel
- ✅ Rate limiting (10 req/min)
- ✅ Idempotencia con Redis
- ✅ Auditoría completa
- ✅ Eventos en tiempo real
- ✅ Estadísticas personales

**Seguridad:**
- ✅ Restricción de permisos implementada
- ✅ Validación de asignaciones
- ✅ Logs de auditoría
- ✅ Rate limiting

---

## Referencias

- [Documentación de Ticket Scan](./TICKET-SCAN.md)
- [Documentación de Checker Assignments](./CHECKER-ASSIGNMENTS.md)
- [Documentación de Rate Limiting](./RATE-LIMITING.md)
- [Documentación de Seguridad](./SECURITY.md)
