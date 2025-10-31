# Checker Assignments - Gestión de Asignaciones

## Descripción

El módulo de Checker Assignments gestiona la asignación de usuarios CHECKER a eventos y recintos específicos. Solo los CHECKERs asignados pueden escanear tickets en los eventos/recintos correspondientes.

**Base URL:** `http://localhost:3000/api/v1/checker-assignments`

---

## Modelo de Datos

### CheckerAssignment Entity

```typescript
{
  id: string;              // UUID
  checkerId: string;       // UUID del usuario CHECKER
  eventId: string;         // UUID del evento
  venueId?: string;        // UUID del recinto (opcional)
  isActive: boolean;       // Si la asignación está activa
  notes?: string;          // Notas adicionales (turno, instrucciones, etc.)
  createdAt: Date;         // Fecha de creación
  updatedAt: Date;         // Última actualización
  assignedBy: string;      // UUID del admin que creó la asignación
}
```

### Tipos de Asignación

#### 1. Asignación Global (sin venueId)
- Checker puede escanear en **cualquier recinto** del evento
- Útil para supervisores o eventos pequeños
```json
{
  "checkerId": "uuid",
  "eventId": "uuid",
  "isActive": true
}
```

#### 2. Asignación Específica (con venueId)
- Checker solo puede escanear en el **recinto especificado**
- Útil para control estricto de accesos
```json
{
  "checkerId": "uuid",
  "eventId": "uuid",
  "venueId": "uuid",
  "isActive": true
}
```

---

## Endpoints

### 1. Crear Asignación (Admin)

Asigna un CHECKER a un evento y opcionalmente a un recinto.

**Endpoint:** `POST /checker-assignments`

**Autenticación:** JWT requerido

**Autorización:** `admin`, `super_admin`

**Request Body:**
```json
{
  "checkerId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "venueId": "550e8400-e29b-41d4-a716-446655440002",
  "notes": "Entrada principal - Turno mañana (08:00-14:00)"
}
```

**Validaciones:**
- `checkerId`: UUID válido, usuario debe existir y ser rol CHECKER
- `eventId`: UUID válido, evento debe existir
- `venueId`: Opcional, UUID válido si se proporciona
- `notes`: Opcional, string hasta 500 caracteres

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/checker-assignments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkerId": "550e8400-e29b-41d4-a716-446655440000",
    "eventId": "550e8400-e29b-41d4-a716-446655440001",
    "venueId": "550e8400-e29b-41d4-a716-446655440002",
    "notes": "Entrada principal"
  }'
```

**Respuesta 201 Created:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "checkerId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "venueId": "550e8400-e29b-41d4-a716-446655440002",
  "isActive": true,
  "notes": "Entrada principal",
  "assignedBy": "550e8400-e29b-41d4-a716-446655440099",
  "createdAt": "2025-10-31T08:00:00.000Z",
  "updatedAt": "2025-10-31T08:00:00.000Z"
}
```

---

### 2. Listar Todas las Asignaciones (Admin)

Obtiene todas las asignaciones con filtros opcionales.

**Endpoint:** `GET /checker-assignments`

**Autenticación:** JWT requerido

**Autorización:** `admin`, `super_admin`

**Query Parameters:**
- `eventId`: Filtrar por evento
- `checkerId`: Filtrar por checker
- `venueId`: Filtrar por recinto
- `isActive`: Filtrar por estado (true/false)

**cURL:**
```bash
# Todas las asignaciones
curl -X GET http://localhost:3000/api/v1/checker-assignments \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Asignaciones de un evento específico
curl -X GET "http://localhost:3000/api/v1/checker-assignments?eventId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Asignaciones activas de un checker
curl -X GET "http://localhost:3000/api/v1/checker-assignments?checkerId=550e8400-e29b-41d4-a716-446655440000&isActive=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta 200 OK:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "checkerId": "550e8400-e29b-41d4-a716-446655440000",
    "checker": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan.checker@eventpass.com"
    },
    "eventId": "550e8400-e29b-41d4-a716-446655440001",
    "event": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Concierto Rock 2025",
      "eventDate": "2025-11-15T20:00:00.000Z"
    },
    "venueId": "550e8400-e29b-41d4-a716-446655440002",
    "venue": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Entrada Principal",
      "capacity": 1000
    },
    "isActive": true,
    "notes": "Turno mañana",
    "createdAt": "2025-10-31T08:00:00.000Z"
  }
]
```

---

### 3. Ver Mis Asignaciones (Checker)

Permite a un CHECKER ver sus propias asignaciones activas.

**Endpoint:** `GET /checker-assignments/my-assignments`

**Autenticación:** JWT requerido

**Autorización:** `checker` únicamente

**Query Parameters:**
- `eventId`: Opcional, filtrar por evento específico

**cURL:**
```bash
# Todas mis asignaciones
curl -X GET http://localhost:3000/api/v1/checker-assignments/my-assignments \
  -H "Authorization: Bearer $CHECKER_TOKEN"

# Mis asignaciones para un evento específico
curl -X GET "http://localhost:3000/api/v1/checker-assignments/my-assignments?eventId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $CHECKER_TOKEN"
```

**Respuesta 200 OK:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "eventId": "550e8400-e29b-41d4-a716-446655440001",
    "eventName": "Concierto Rock 2025",
    "eventDate": "2025-11-15T20:00:00.000Z",
    "venueId": "550e8400-e29b-41d4-a716-446655440002",
    "venueName": "Entrada Principal",
    "venueCapacity": 1000,
    "isActive": true,
    "notes": "Turno mañana 08:00-14:00",
    "assignedAt": "2025-10-31T08:00:00.000Z"
  }
]
```

---

### 4. Obtener Asignación por ID (Admin)

Obtiene los detalles completos de una asignación específica.

**Endpoint:** `GET /checker-assignments/:id`

**Autenticación:** JWT requerido

**Autorización:** `admin`, `super_admin`

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/checker-assignments/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta 200 OK:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "checkerId": "550e8400-e29b-41d4-a716-446655440000",
  "checker": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan.checker@eventpass.com",
    "role": "checker"
  },
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Concierto Rock 2025",
    "eventDate": "2025-11-15T20:00:00.000Z",
    "isActive": true
  },
  "venueId": "550e8400-e29b-41d4-a716-446655440002",
  "venue": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Entrada Principal",
    "capacity": 1000,
    "address": "Av. Principal 123"
  },
  "isActive": true,
  "notes": "Turno mañana",
  "assignedBy": "550e8400-e29b-41d4-a716-446655440099",
  "createdAt": "2025-10-31T08:00:00.000Z",
  "updatedAt": "2025-10-31T08:00:00.000Z"
}
```

---

### 5. Actualizar Asignación (Admin)

Modifica una asignación existente (cambiar recinto, desactivar, actualizar notas).

**Endpoint:** `PATCH /checker-assignments/:id`

**Autenticación:** JWT requerido

**Autorización:** `admin`, `super_admin`

**Request Body (campos opcionales):**
```json
{
  "venueId": "550e8400-e29b-41d4-a716-446655440003",
  "isActive": false,
  "notes": "Reasignado a entrada VIP"
}
```

**cURL:**
```bash
# Desactivar asignación
curl -X PATCH http://localhost:3000/api/v1/checker-assignments/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Cambiar de recinto
curl -X PATCH http://localhost:3000/api/v1/checker-assignments/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "550e8400-e29b-41d4-a716-446655440003",
    "notes": "Reasignado a VIP por necesidad"
  }'
```

**Respuesta 200 OK:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "checkerId": "550e8400-e29b-41d4-a716-446655440000",
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "venueId": "550e8400-e29b-41d4-a716-446655440003",
  "isActive": true,
  "notes": "Reasignado a VIP por necesidad",
  "updatedAt": "2025-10-31T10:30:00.000Z"
}
```

---

### 6. Eliminar Asignación (Admin)

Elimina permanentemente una asignación. **Usar con precaución** - preferir desactivar (`isActive: false`).

**Endpoint:** `DELETE /checker-assignments/:id`

**Autenticación:** JWT requerido

**Autorización:** `super_admin` únicamente

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/checker-assignments/550e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

**Respuesta 200 OK:**
```json
{
  "message": "Assignment deleted successfully",
  "deletedId": "550e8400-e29b-41d4-a716-446655440010"
}
```

---

## Casos de Uso

### Caso 1: Asignar Múltiples Checkers a un Evento Grande

```bash
# Evento: Concierto con 3 entradas (Principal, VIP, BackStage)
# Asignar 5 checkers a entrada principal

CHECKERS=("checker-1" "checker-2" "checker-3" "checker-4" "checker-5")
EVENT_ID="concert-event-id"
MAIN_ENTRANCE_ID="main-entrance-id"

for checker in "${CHECKERS[@]}"; do
  curl -X POST http://localhost:3000/api/v1/checker-assignments \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"checkerId\": \"${checker}\",
      \"eventId\": \"${EVENT_ID}\",
      \"venueId\": \"${MAIN_ENTRANCE_ID}\",
      \"isActive\": true,
      \"notes\": \"Entrada principal - Auto-asignado\"
    }"
done
```

### Caso 2: Reasignar Checker de un Recinto a Otro Durante el Evento

```bash
# 1. Obtener asignación actual
ASSIGNMENT_ID=$(curl -X GET "http://localhost:3000/api/v1/checker-assignments?checkerId=checker-123&isActive=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')

# 2. Desactivar asignación actual
curl -X PATCH http://localhost:3000/api/v1/checker-assignments/$ASSIGNMENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# 3. Crear nueva asignación en otro recinto
curl -X POST http://localhost:3000/api/v1/checker-assignments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkerId": "checker-123",
    "eventId": "event-id",
    "venueId": "new-venue-id",
    "isActive": true,
    "notes": "Reasignado desde Principal a VIP"
  }'
```

### Caso 3: Checker Consulta Sus Asignaciones al Inicio del Turno

```bash
# Checker hace login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"checker@eventpass.com","password":"pass123"}' | jq -r '.token')

# Ver asignaciones activas
curl -X GET http://localhost:3000/api/v1/checker-assignments/my-assignments \
  -H "Authorization: Bearer $TOKEN"
```

### Caso 4: Admin Revisa Cobertura de Checkers para un Evento

```bash
# Obtener todas las asignaciones del evento
curl -X GET "http://localhost:3000/api/v1/checker-assignments?eventId=event-123&isActive=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Agrupar por venue para ver distribución
curl -X GET "http://localhost:3000/api/v1/checker-assignments?eventId=event-123&isActive=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq 'group_by(.venueId) | map({venue: .[0].venue.name, checkers: length})'
```

---

## Validaciones

### Al Crear Asignación

1. **Usuario debe ser CHECKER**
   ```
   Error: Usuario debe tener rol 'checker'
   Status: 400 Bad Request
   ```

2. **No puede haber asignaciones duplicadas activas**
   ```
   Error: Checker ya está asignado a este evento/recinto
   Status: 409 Conflict
   ```

3. **Evento debe existir y estar activo**
   ```
   Error: Evento no encontrado o inactivo
   Status: 404 Not Found
   ```

4. **Venue debe pertenecer al evento**
   ```
   Error: El recinto no pertenece a este evento
   Status: 400 Bad Request
   ```

### Al Escanear Ticket

El sistema valida automáticamente que:
1. El checker tenga asignación activa al evento
2. Si la asignación especifica `venueId`, el escaneo debe ser en ese recinto
3. La asignación no haya expirado (evento aún activo)

---

## Best Practices

### 1. Asignación Anticipada

✅ **Correcto**: Asignar checkers 24-48 horas antes del evento
```bash
# Crear asignaciones con anticipación
curl -X POST ... -d '{...}'
```

❌ **Incorrecto**: Asignar checkers 5 minutos antes del evento (puede causar confusión)

### 2. Uso de Notas

✅ **Correcto**: Incluir información útil
```json
{
  "notes": "Turno mañana 08:00-14:00. Contacto: +34 600 123 456. Supervisor: María García"
}
```

❌ **Incorrecto**: Notas vacías o sin contexto
```json
{
  "notes": "checker 1"
}
```

### 3. Desactivar en Lugar de Eliminar

✅ **Correcto**: Desactivar asignaciones
```bash
PATCH /checker-assignments/:id
{ "isActive": false }
```

❌ **Incorrecto**: Eliminar asignaciones (se pierde historial)
```bash
DELETE /checker-assignments/:id
```

### 4. Verificar Cobertura

✅ **Correcto**: Revisar que todos los recintos tengan checkers asignados
```bash
# Script de verificación
for venue in $(get_event_venues $EVENT_ID); do
  count=$(count_active_checkers $EVENT_ID $venue)
  echo "Venue $venue: $count checkers"
done
```

---

## Reportes y Analytics

### Query SQL: Asignaciones por Evento

```sql
SELECT
  e.name as event_name,
  v.name as venue_name,
  COUNT(DISTINCT ca.checkerId) as checker_count,
  v.capacity as venue_capacity,
  ROUND(v.capacity::numeric / COUNT(DISTINCT ca.checkerId), 2) as attendees_per_checker
FROM checker_assignments ca
JOIN events e ON ca.eventId = e.id
LEFT JOIN venues v ON ca.venueId = v.id
WHERE ca.isActive = true
  AND e.eventDate >= NOW()
GROUP BY e.id, e.name, v.id, v.name, v.capacity
ORDER BY e.eventDate;
```

### Query SQL: Checkers Más Activos

```sql
SELECT
  u.firstName || ' ' || u.lastName as checker_name,
  COUNT(DISTINCT ca.eventId) as events_assigned,
  SUM(CASE WHEN e.eventDate < NOW() THEN 1 ELSE 0 END) as past_events,
  SUM(CASE WHEN e.eventDate >= NOW() THEN 1 ELSE 0 END) as upcoming_events
FROM users u
JOIN checker_assignments ca ON u.id = ca.checkerId
JOIN events e ON ca.eventId = e.id
WHERE u.role = 'checker'
GROUP BY u.id, u.firstName, u.lastName
ORDER BY events_assigned DESC
LIMIT 10;
```

---

## Troubleshooting

### Problema: "Checker ya está asignado"

**Causa**: Intento de crear asignación duplicada.

**Solución**:
1. Verificar asignaciones existentes:
   ```bash
   GET /checker-assignments?checkerId=xxx&eventId=yyy&isActive=true
   ```
2. Si existe, actualizar en lugar de crear nueva
3. Si debe tener múltiples asignaciones, usar diferentes `venueId`

### Problema: Checker no puede escanear

**Causa**: No tiene asignación activa al evento/recinto.

**Solución**:
1. Verificar asignaciones del checker:
   ```bash
   GET /checker-assignments/my-assignments
   ```
2. Si no aparece el evento, contactar admin
3. Admin crear/activar asignación

### Problema: Demasiados checkers en un recinto

**Causa**: Sobre-asignación.

**Solución**:
```bash
# 1. Listar checkers del recinto
GET /checker-assignments?venueId=xxx&isActive=true

# 2. Desactivar checkers excedentes
PATCH /checker-assignments/:id { "isActive": false }

# 3. Reasignar a otros recintos si es necesario
POST /checker-assignments { ... }
```

---

## Seguridad

### Permisos

- **Crear/Modificar/Eliminar**: Solo `admin` y `super_admin`
- **Ver todas**: Solo `admin` y `super_admin`
- **Ver propias**: Solo `checker` (sus propias asignaciones)

### Auditoría

Todas las operaciones se registran:
```typescript
{
  action: 'CREATE_CHECKER_ASSIGNMENT',
  performedBy: 'admin-uuid',
  targetChecker: 'checker-uuid',
  eventId: 'event-uuid',
  venueId: 'venue-uuid',
  timestamp: '2025-10-31T08:00:00.000Z'
}
```

---

## Changelog

### v1.0.0 (2025-10-31)

**Features Iniciales:**
- ✅ CRUD completo de asignaciones
- ✅ Asignación global y por recinto
- ✅ Endpoint para checkers ver sus asignaciones
- ✅ Validación de duplicados
- ✅ Notas y metadatos
- ✅ Soft delete con isActive

---

## Ver También

- [Documentación de CHECKER](./CHECKER.md)
- [Documentación de Ticket Scan](./TICKET-SCAN.md)
- [Documentación de Eventos](./EVENTS.md)
- [Documentación de Recintos](./VENUES.md)
