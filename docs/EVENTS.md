# Módulo de Eventos (Events)

## Descripción

El módulo de eventos maneja la gestión completa del ciclo de vida de eventos en la plataforma. Permite a organizadores crear, actualizar, cancelar y gestionar eventos, mientras que los clientes pueden explorar y descubrir eventos disponibles.

**Base URL:** `http://localhost:3000/api/v1/events`

---

## Endpoints

### 1. Crear Evento

Permite a organizadores y super-administradores crear nuevos eventos en el sistema.

**Endpoint:** `POST /events`

**Autenticación:** JWT requerido (organizer, super_admin)

**Request Body:**
```json
{
  "venueId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Concierto Rock en Vivo 2025",
  "description": "Un increíble concierto de rock con las mejores bandas nacionales. Incluye apertura de puertas a las 19:00 hrs y show principal a las 21:00 hrs.",
  "category": "concert",
  "eventDate": "2025-12-31T20:00:00.000Z",
  "imageUrl": "https://example.com/images/event-banner.jpg",
  "ticketPrice": 25000,
  "totalTickets": 1000
}
```

**Validaciones:**
- `venueId`: UUID válido, recinto debe existir
- `title`: Requerido, 5-200 caracteres
- `description`: Requerido, 50-2000 caracteres
- `category`: Requerido, enum: `concert`, `sports`, `other`
- `eventDate`: Requerido, formato ISO 8601, **debe ser fecha futura**
- `imageUrl`: Opcional, URL válida, máximo 500 caracteres
- `ticketPrice`: Requerido, número mayor a 0
- `totalTickets`: Requerido, número entero mayor a 0, **no debe exceder capacidad del recinto**

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "venueId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Concierto Rock en Vivo 2025",
    "description": "Un increíble concierto de rock con las mejores bandas nacionales. Incluye apertura de puertas a las 19:00 hrs y show principal a las 21:00 hrs.",
    "category": "concert",
    "eventDate": "2025-12-31T20:00:00.000Z",
    "imageUrl": "https://example.com/images/event-banner.jpg",
    "ticketPrice": 25000,
    "totalTickets": 1000
  }'
```

**Response 201 (Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "venueId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Concierto Rock en Vivo 2025",
  "description": "Un increíble concierto de rock con las mejores bandas nacionales...",
  "category": "concert",
  "eventDate": "2025-12-31T20:00:00.000Z",
  "imageUrl": "https://example.com/images/event-banner.jpg",
  "ticketPrice": 25000,
  "totalTickets": 1000,
  "soldTickets": 0,
  "isActive": true,
  "isCancelled": false,
  "organizerId": "770e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2025-01-28T10:30:00.000Z",
  "updatedAt": "2025-01-28T10:30:00.000Z",
  "deletedAt": null
}
```

**Response 400 (Bad Request - Validación):**
```json
{
  "statusCode": 400,
  "message": [
    "El título debe tener al menos 5 caracteres",
    "La fecha del evento debe ser en el futuro",
    "La cantidad de boletos (1500) excede la capacidad del recinto (1000)"
  ],
  "error": "Bad Request"
}
```

**Response 404 (Not Found - Recinto no existe):**
```json
{
  "statusCode": 404,
  "message": "Recinto no encontrado",
  "error": "Not Found"
}
```

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: organizer, super_admin",
  "error": "Forbidden"
}
```

---

### 2. Listar Eventos (Público)

Lista todos los eventos activos y no cancelados. Endpoint público, no requiere autenticación.

**Endpoint:** `GET /events`

**Autenticación:** NO requerida (público)

**Caché:** Habilitado (5 minutos TTL)

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `page` | number | No | 1 | Número de página |
| `limit` | number | No | 50 | Resultados por página (máx: 100) |
| `category` | string | No | - | Filtrar por categoría: concert, sports, other |
| `search` | string | No | - | Búsqueda por título (parcial, case-sensitive) |
| `city` | string | No | - | Filtrar por ciudad del recinto |
| `organizerId` | string | No | - | Filtrar por ID del organizador |
| `sortBy` | string | No | eventDate | Campo para ordenar |
| `sortOrder` | string | No | ASC | Orden: ASC o DESC |

**cURL:**
```bash
# Listar todos los eventos
curl -X GET "http://localhost:3000/api/v1/events?page=1&limit=50"

# Filtrar por categoría
curl -X GET "http://localhost:3000/api/v1/events?category=concert"

# Buscar por título
curl -X GET "http://localhost:3000/api/v1/events?search=Rock"

# Filtrar por ciudad
curl -X GET "http://localhost:3000/api/v1/events?city=Santiago"

# Combinar filtros
curl -X GET "http://localhost:3000/api/v1/events?category=concert&city=Santiago&sortBy=ticketPrice&sortOrder=ASC"
```

**Response 200 (OK):**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Concierto Rock en Vivo 2025",
      "description": "Un increíble concierto de rock...",
      "category": "concert",
      "eventDate": "2025-12-31T20:00:00.000Z",
      "imageUrl": "https://example.com/images/event-banner.jpg",
      "ticketPrice": 25000,
      "totalTickets": 1000,
      "soldTickets": 150,
      "isActive": true,
      "isCancelled": false,
      "venue": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Teatro Municipal",
        "address": "Agustinas 794",
        "city": "Santiago",
        "country": "CL",
        "capacity": 1000
      },
      "organizer": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "email": "organizer@example.com",
        "firstName": "Juan",
        "lastName": "Pérez",
        "role": "organizador"
      },
      "createdAt": "2025-01-28T10:30:00.000Z",
      "updatedAt": "2025-01-28T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

### 3. Obtener Evento por ID (Público)

Obtiene la información completa de un evento específico. Endpoint público.

**Endpoint:** `GET /events/:id`

**Autenticación:** NO requerida (público)

**Caché:** Habilitado (5 minutos TTL)

**Parámetros de Ruta:**
- `id`: UUID del evento

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/events/660e8400-e29b-41d4-a716-446655440001
```

**Response 200 (OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Concierto Rock en Vivo 2025",
  "description": "Un increíble concierto de rock con las mejores bandas nacionales...",
  "category": "concert",
  "eventDate": "2025-12-31T20:00:00.000Z",
  "imageUrl": "https://example.com/images/event-banner.jpg",
  "ticketPrice": 25000,
  "totalTickets": 1000,
  "soldTickets": 150,
  "isActive": true,
  "isCancelled": false,
  "venue": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Teatro Municipal",
    "address": "Agustinas 794, Santiago Centro",
    "city": "Santiago",
    "country": "CL",
    "capacity": 1000
  },
  "organizer": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "organizer@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "organizador"
  },
  "createdAt": "2025-01-28T10:30:00.000Z",
  "updatedAt": "2025-01-28T10:30:00.000Z",
  "deletedAt": null
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Evento no encontrado",
  "error": "Not Found"
}
```

---

### 4. Listar Mis Eventos

Lista todos los eventos del organizador autenticado con paginación y filtros.

**Endpoint:** `GET /events/my-events`

**Autenticación:** JWT requerido (organizer, super_admin)

**Query Parameters:** Los mismos que GET /events

**cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/events/my-events?page=1&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Concierto Rock en Vivo 2025",
      "category": "concert",
      "eventDate": "2025-12-31T20:00:00.000Z",
      "ticketPrice": 25000,
      "totalTickets": 1000,
      "soldTickets": 150,
      "isActive": true,
      "isCancelled": false,
      "venue": {
        "name": "Teatro Municipal",
        "city": "Santiago"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: organizer, super_admin",
  "error": "Forbidden"
}
```

---

### 5. Actualizar Evento

Permite actualizar los datos de un evento. Solo el organizador propietario o super_admin pueden actualizar.

**Endpoint:** `PATCH /events/:id`

**Autenticación:** JWT requerido (organizer propietario, super_admin)

**Request Body (todos los campos opcionales):**
```json
{
  "title": "Concierto Rock en Vivo 2025 - ACTUALIZADO",
  "description": "Nueva descripción actualizada del evento con más detalles...",
  "category": "concert",
  "eventDate": "2026-01-15T20:00:00.000Z",
  "imageUrl": "https://example.com/new-image.jpg",
  "ticketPrice": 30000,
  "totalTickets": 800
}
```

**Restricciones:**
- **NO se puede actualizar** `venueId` (el recinto no cambia)
- **NO se puede actualizar** eventos pasados
- **NO se puede actualizar** eventos cancelados
- Si se actualiza `eventDate`, debe ser fecha futura
- Si se actualiza `totalTickets`, no debe exceder capacidad del recinto
- Si se actualiza `totalTickets`, no puede ser menor que `soldTickets`

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/events/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Concierto Rock en Vivo 2025 - ACTUALIZADO",
    "ticketPrice": 30000
  }'
```

**Response 200 (OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Concierto Rock en Vivo 2025 - ACTUALIZADO",
  "ticketPrice": 30000,
  "updatedAt": "2025-01-28T15:45:00.000Z"
}
```

**Response 400 (Bad Request - Evento pasado):**
```json
{
  "statusCode": 400,
  "message": "No se puede actualizar un evento que ya finalizó",
  "error": "Bad Request"
}
```

**Response 400 (Bad Request - Evento cancelado):**
```json
{
  "statusCode": 400,
  "message": "No se puede actualizar un evento cancelado",
  "error": "Bad Request"
}
```

**Response 400 (Bad Request - Tickets vendidos):**
```json
{
  "statusCode": 400,
  "message": "No se puede reducir la cantidad de boletos (300) por debajo de los boletos ya vendidos (500)",
  "error": "Bad Request"
}
```

**Response 403 (Forbidden - No es propietario):**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para actualizar este evento",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "Evento no encontrado",
  "error": "Not Found"
}
```

---

### 6. Cancelar Evento

Marca un evento como cancelado. Solo el organizador propietario o super_admin pueden cancelar.

**Endpoint:** `PATCH /events/:id/cancel`

**Autenticación:** JWT requerido (organizer propietario, super_admin)

**Restricciones:**
- **NO se puede cancelar** eventos pasados
- **NO se puede cancelar** eventos ya cancelados

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/events/660e8400-e29b-41d4-a716-446655440001/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Concierto Rock en Vivo 2025",
  "isCancelled": true,
  "isActive": false,
  "updatedAt": "2025-01-28T16:00:00.000Z"
}
```

**Response 400 (Bad Request - Evento pasado):**
```json
{
  "statusCode": 400,
  "message": "No se puede cancelar un evento que ya finalizó",
  "error": "Bad Request"
}
```

**Response 400 (Bad Request - Ya cancelado):**
```json
{
  "statusCode": 400,
  "message": "El evento ya está cancelado",
  "error": "Bad Request"
}
```

**Response 403 (Forbidden - No es propietario):**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para cancelar este evento",
  "error": "Forbidden"
}
```

---

## Categorías de Eventos

Los eventos se clasifican en tres categorías principales:

| Categoría | Valor | Descripción |
|-----------|-------|-------------|
| Conciertos | `concert` | Eventos musicales, conciertos, festivales |
| Deportes | `sports` | Eventos deportivos, partidos, competencias |
| Otros | `other` | Cualquier otro tipo de evento |

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa (GET, PATCH) |
| 201 | Evento creado exitosamente (POST) |
| 400 | Datos inválidos, fecha pasada, o validación fallida |
| 401 | No autenticado o token inválido |
| 403 | No autorizado - Rol insuficiente o no es propietario |
| 404 | Evento o recinto no encontrado |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno del servidor |

---

## Reglas de Negocio

### Creación de Eventos

1. Solo `organizer` y `super_admin` pueden crear eventos
2. Todos los campos son obligatorios excepto `imageUrl`
3. **La fecha del evento debe ser en el futuro**
4. **totalTickets no debe exceder la capacidad del recinto**
5. El evento se crea con `soldTickets = 0`, `isActive = true`, `isCancelled = false`
6. El `organizerId` se asigna automáticamente al usuario autenticado

### Listado de Eventos

1. El endpoint público (GET /events) NO requiere autenticación
2. Solo muestra eventos activos (`isActive = true`) y no cancelados (`isCancelled = false`)
3. Los eventos eliminados (soft delete) NO aparecen en el listado
4. La búsqueda por título es case-sensitive y busca coincidencias parciales
5. Los filtros se pueden combinar (category + city + search)
6. Resultados ordenados por `eventDate ASC` por defecto

### Actualización de Eventos

1. Solo el organizador propietario o `super_admin` pueden actualizar
2. **NO se puede actualizar eventos que ya finalizaron**
3. **NO se puede actualizar eventos cancelados**
4. Si se actualiza `eventDate`, debe ser fecha futura
5. Si se actualiza `totalTickets`:
   - No debe exceder capacidad del recinto
   - No puede ser menor que `soldTickets`
6. **NO se puede cambiar** el `venueId` (recinto)

### Cancelación de Eventos

1. Solo el organizador propietario o `super_admin` pueden cancelar
2. **NO se puede cancelar eventos que ya finalizaron**
3. **NO se puede cancelar eventos ya cancelados**
4. Al cancelar: `isCancelled = true`, `isActive = false`
5. Los eventos cancelados NO aparecen en listados públicos
6. Los eventos cancelados NO se pueden actualizar

---

## Seguridad

### Autenticación JWT

Endpoints protegidos requieren autenticación JWT mediante Bearer token:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autorización por Roles y Propiedad

| Endpoint | Roles Permitidos | Validación Adicional |
|----------|------------------|----------------------|
| `POST /events` | organizer, super_admin | - |
| `GET /events` | **Público** (no requiere auth) | - |
| `GET /events/:id` | **Público** (no requiere auth) | - |
| `GET /events/my-events` | organizer, super_admin | Solo sus eventos |
| `PATCH /events/:id` | organizer, super_admin | Solo propietario o super_admin |
| `PATCH /events/:id/cancel` | organizer, super_admin | Solo propietario o super_admin |

**Nota importante:** Los endpoints públicos (`GET /events` y `GET /events/:id`) NO requieren token JWT.

### Rate Limiting

- **Límite Global**: 100 requests por minuto por IP
- **Headers informativos**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1705320000000
  ```

### Caché

- **Endpoints cacheados**: `GET /events` y `GET /events/:id`
- **TTL**: 5 minutos (300 segundos)
- **Invalidación**: Automática después de TTL
- **Beneficio**: Reduce carga en base de datos para listados frecuentes

---

## Ejemplos de Flujos Completos

### Flujo 1: Organizer Crea y Gestiona Evento

```bash
# 1. Login como organizador
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "OrganizerPass123!"
  }'

# Respuesta incluye accessToken
# {
#   "user": { "id": "org-uuid", "role": "organizador", ... },
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "refreshToken": "..."
# }

# 2. Crear nuevo evento
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "venueId": "venue-uuid",
    "title": "Festival de Jazz 2025",
    "description": "Tres días de jazz con artistas internacionales de renombre. Incluye workshops y jam sessions nocturnas.",
    "category": "concert",
    "eventDate": "2025-06-15T18:00:00.000Z",
    "imageUrl": "https://example.com/jazz-festival.jpg",
    "ticketPrice": 45000,
    "totalTickets": 500
  }'

# Respuesta incluye el ID del evento creado
# { "id": "event-uuid", "title": "Festival de Jazz 2025", ... }

# 3. Actualizar precio del evento
curl -X PATCH http://localhost:3000/api/v1/events/event-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "ticketPrice": 50000
  }'

# 4. Listar mis eventos
curl -X GET "http://localhost:3000/api/v1/events/my-events" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 5. Cancelar evento (si es necesario)
curl -X PATCH http://localhost:3000/api/v1/events/event-uuid/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Flujo 2: Cliente Explora Eventos (Sin Autenticación)

```bash
# 1. Listar todos los eventos
curl -X GET "http://localhost:3000/api/v1/events?page=1&limit=50"

# 2. Buscar conciertos en Santiago
curl -X GET "http://localhost:3000/api/v1/events?category=concert&city=Santiago"

# 3. Buscar eventos de "Rock"
curl -X GET "http://localhost:3000/api/v1/events?search=Rock"

# 4. Ver detalles de un evento específico
curl -X GET http://localhost:3000/api/v1/events/event-uuid

# 5. Ordenar por precio (más baratos primero)
curl -X GET "http://localhost:3000/api/v1/events?sortBy=ticketPrice&sortOrder=ASC"
```

### Flujo 3: Manejo de Errores Comunes

```bash
# 1. Intentar crear evento sin autenticación
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{ "title": "Test Event", ... }'
# Resultado: 401 Unauthorized

# 2. Intentar crear evento como cliente
curl -X POST http://localhost:3000/api/v1/events \
  -H "Authorization: Bearer <token-de-cliente>" \
  -d '{ "title": "Test Event", ... }'
# Resultado: 403 Forbidden

# 3. Crear evento con fecha en el pasado
curl -X POST http://localhost:3000/api/v1/events \
  -H "Authorization: Bearer <token-de-organizador>" \
  -d '{
    "venueId": "venue-uuid",
    "title": "Evento Pasado",
    "description": "Este evento tiene fecha pasada...",
    "category": "other",
    "eventDate": "2020-01-01T10:00:00.000Z",
    "ticketPrice": 5000,
    "totalTickets": 100
  }'
# Resultado: 400 Bad Request - "La fecha del evento debe ser en el futuro"

# 4. Crear evento excediendo capacidad del recinto
curl -X POST http://localhost:3000/api/v1/events \
  -H "Authorization: Bearer <token-de-organizador>" \
  -d '{
    "venueId": "venue-uuid",
    "totalTickets": 5000,
    ...
  }'
# Resultado: 400 Bad Request - "excede la capacidad del recinto"

# 5. Actualizar evento de otro organizador
curl -X PATCH http://localhost:3000/api/v1/events/event-uuid \
  -H "Authorization: Bearer <token-de-otro-organizador>" \
  -d '{ "title": "Nuevo Título" }'
# Resultado: 403 Forbidden - "No tienes permiso para actualizar este evento"
```

---

## Troubleshooting

### "La fecha del evento debe ser en el futuro"
- Asegúrate de usar una fecha futura en formato ISO 8601
- Verifica la zona horaria de tu fecha
- Ejemplo correcto: `"2025-12-31T20:00:00.000Z"`

### "La cantidad de boletos excede la capacidad del recinto"
- Verifica la capacidad del recinto primero: `GET /venues/:id`
- Asegúrate de que `totalTickets <= venue.capacity`
- Ejemplo: Si capacidad es 1000, máximo 1000 tickets

### "No se puede reducir la cantidad de boletos por debajo de los boletos ya vendidos"
- No puedes reducir `totalTickets` si ya vendiste más boletos
- Ejemplo: Si `soldTickets = 500`, `totalTickets` debe ser >= 500
- Solución: Solo puedes aumentar o mantener el número

### "No se puede actualizar un evento que ya finalizó"
- No puedes modificar eventos cuya fecha ya pasó
- Verifica la fecha del evento: `GET /events/:id`
- Los eventos pasados son de solo lectura

### "No se puede actualizar un evento cancelado"
- Los eventos cancelados (`isCancelled = true`) no se pueden editar
- Si cancelaste por error, contacta al administrador
- Alternativa: Crear un nuevo evento

### "No tienes permiso para actualizar/cancelar este evento"
- Solo el organizador propietario puede modificar su evento
- Verifica que el `organizerId` del evento coincida con tu usuario
- Los `super_admin` pueden modificar cualquier evento

### "Recinto no encontrado"
- El `venueId` proporcionado no existe
- Verifica que el UUID sea correcto
- Lista recintos disponibles: `GET /venues`

### Búsqueda no encuentra resultados
- La búsqueda por título es case-sensitive
- Buscar `"Rock"` NO encontrará `"rock"` (minúsculas)
- El filtro por ciudad debe ser exacto
- Verifica ortografía y capitalización

### Cache no se actualiza inmediatamente
- Los endpoints GET tienen caché de 5 minutos
- Cambios pueden tardar hasta 5 minutos en reflejarse
- Para ver cambios inmediatos, usa endpoints autenticados o espera TTL

---

## Casos de Uso

### Caso de Uso 1: Organizar un Concierto

**Actor:** Organizador de eventos

**Flujo:**
1. Organizador busca recinto disponible (`GET /venues?city=Santiago`)
2. Selecciona recinto con capacidad adecuada
3. Crea evento con detalles del concierto (`POST /events`)
4. Configura precio de boletos y cantidad disponible
5. Publica imagen promocional del evento
6. Monitorea ventas en dashboard de "Mis Eventos"

**Beneficio:** Gestión completa del ciclo de vida del evento

### Caso de Uso 2: Cliente Busca Eventos

**Actor:** Cliente potencial

**Flujo:**
1. Cliente explora eventos disponibles sin necesidad de login
2. Filtra por categoría (conciertos)
3. Filtra por ciudad (Santiago)
4. Busca por artista/nombre del evento
5. Ve detalles completos del evento elegido
6. Procede a comprar boletos

**Beneficio:** Descubrimiento fácil de eventos sin barreras

### Caso de Uso 3: Cancelación de Evento

**Actor:** Organizador de eventos

**Flujo:**
1. Organizador detecta problema (clima, artista canceló, etc.)
2. Accede a "Mis Eventos"
3. Selecciona evento a cancelar
4. Confirma cancelación (`PATCH /events/:id/cancel`)
5. Sistema marca evento como cancelado
6. Evento ya no aparece en listados públicos
7. Sistema notifica a compradores (funcionalidad futura)

**Beneficio:** Gestión transparente de cancelaciones

---

## Integraciones Futuras

### Funcionalidades Planeadas

1. **Sistema de Boletos**
   - Creación y gestión de boletos
   - Diferentes tipos de boletos (VIP, General, etc.)
   - Control de inventario en tiempo real

2. **Pagos**
   - Integración con Stripe/MercadoPago
   - Procesamiento de pagos seguros
   - Gestión de reembolsos para eventos cancelados

3. **Notificaciones**
   - Email a compradores cuando se cancela evento
   - Recordatorios antes del evento
   - Notificaciones de cambios de fecha/precio

4. **Estadísticas y Analytics**
   - Dashboard de ventas para organizadores
   - Métricas de eventos más populares
   - Reportes de ingresos

5. **Funcionalidades Adicionales**
   - Eventos recurrentes (series, temporadas)
   - Sistema de descuentos y promociones
   - Check-in digital con QR codes
   - Valoraciones y reseñas de eventos

6. **Integración con Redes Sociales**
   - Compartir eventos en redes sociales
   - Login social (Google, Facebook)
   - Invitaciones a amigos

---

## Configuración

### Variables de Entorno

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1d

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=eventpass_dev

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Cache
CACHE_TTL=300  # 5 minutes in seconds
```

---

**Última actualización:** 2025-01-28
