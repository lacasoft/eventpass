# Módulo de Recintos (Venues)

## Descripción

El módulo de recintos (venues) maneja la gestión de lugares físicos donde se realizan eventos. Permite a organizadores y administradores crear, listar y consultar información detallada de recintos.

**Base URL:** `http://localhost:3000/api/v1/venues`

---

## Endpoints

### 1. Crear Recinto

Permite a organizadores y super-administradores crear nuevos recintos en el sistema.

**Endpoint:** `POST /venues`

**Autenticación:** JWT requerido (organizer, super_admin)

**Request Body:**
```json
{
  "name": "Teatro Municipal de Santiago",
  "address": "Agustinas 794, Santiago Centro",
  "city": "Santiago",
  "country": "CL",
  "capacity": 1500
}
```

**Validaciones:**
- `name`: Requerido, máximo 200 caracteres
- `address`: Requerido, máximo 500 caracteres
- `city`: Requerido, máximo 100 caracteres
- `country`: Código ISO 3166-1 alpha-2 (2 letras mayúsculas, ejemplo: CL, MX, AR)
- `capacity`: Requerido, número entero mayor a 0

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Teatro Municipal de Santiago",
    "address": "Agustinas 794, Santiago Centro",
    "city": "Santiago",
    "country": "CL",
    "capacity": 1500
  }'
```

**Response 201 (Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Teatro Municipal de Santiago",
  "address": "Agustinas 794, Santiago Centro",
  "city": "Santiago",
  "country": "CL",
  "capacity": 1500,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "deletedAt": null
}
```

**Response 400 (Bad Request - Validación):**
```json
{
  "statusCode": 400,
  "message": [
    "El nombre es requerido",
    "La capacidad debe ser mayor a 0",
    "El código de país debe ser un código ISO 3166-1 alpha-2 válido (2 letras mayúsculas)"
  ],
  "error": "Bad Request"
}
```

**Response 403 (Forbidden - Rol insuficiente):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: organizer, super_admin",
  "error": "Forbidden"
}
```

---

### 2. Listar Recintos

Permite listar todos los recintos con paginación, filtrado por ciudad y búsqueda por nombre.

**Endpoint:** `GET /venues`

**Autenticación:** JWT requerido (organizer, admin, super_admin)

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `page` | number | No | 1 | Número de página |
| `limit` | number | No | 50 | Cantidad de resultados por página |
| `city` | string | No | - | Filtrar por ciudad (exacta) |
| `search` | string | No | - | Búsqueda por nombre (parcial, case-sensitive) |
| `sortBy` | string | No | createdAt | Campo para ordenar (name, city, capacity, createdAt) |
| `sortOrder` | string | No | DESC | Orden: ASC o DESC |

**cURL:**
```bash
# Listar todos los recintos (primera página)
curl -X GET "http://localhost:3000/api/v1/venues?page=1&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por ciudad
curl -X GET "http://localhost:3000/api/v1/venues?city=Santiago" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar por nombre
curl -X GET "http://localhost:3000/api/v1/venues?search=Teatro" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Combinar filtros
curl -X GET "http://localhost:3000/api/v1/venues?city=Santiago&search=Teatro&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Ordenar por capacidad ascendente
curl -X GET "http://localhost:3000/api/v1/venues?sortBy=capacity&sortOrder=ASC" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Auditorio Nacional",
      "address": "Paseo de la Reforma 50",
      "city": "Ciudad de México",
      "country": "MX",
      "capacity": 10000,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      "deletedAt": null
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Teatro Municipal de Santiago",
      "address": "Agustinas 794, Santiago Centro",
      "city": "Santiago",
      "country": "CL",
      "capacity": 1500,
      "createdAt": "2025-01-19T14:20:00.000Z",
      "updatedAt": "2025-01-19T14:20:00.000Z",
      "deletedAt": null
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

**Response 403 (Forbidden - Rol insuficiente):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: organizer, admin, super_admin",
  "error": "Forbidden"
}
```

**Response 401 (Unauthorized - Token inválido):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

### 3. Obtener Recinto por ID

Permite obtener la información detallada de un recinto específico.

**Endpoint:** `GET /venues/:id`

**Autenticación:** JWT requerido (organizer, admin, super_admin)

**Parámetros de Ruta:**
- `id`: UUID del recinto

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/venues/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Teatro Municipal de Santiago",
  "address": "Agustinas 794, Santiago Centro",
  "city": "Santiago",
  "country": "CL",
  "capacity": 1500,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "deletedAt": null
}
```

**Response 404 (Not Found - Recinto no existe):**
```json
{
  "statusCode": 404,
  "message": "Venue not found",
  "error": "Not Found"
}
```

**Response 403 (Forbidden - Rol insuficiente):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: organizer, admin, super_admin",
  "error": "Forbidden"
}
```

**Response 401 (Unauthorized - Token inválido):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## Información de Paginación

### Metadata de Respuesta

Todos los endpoints de listado retornan metadata de paginación:

```json
{
  "meta": {
    "page": 1,           // Página actual
    "limit": 50,         // Resultados por página
    "total": 125,        // Total de registros
    "totalPages": 3,     // Total de páginas
    "hasNextPage": true, // ¿Hay página siguiente?
    "hasPreviousPage": false  // ¿Hay página anterior?
  }
}
```

### Límites de Paginación

- **Mínimo**: 1 resultado por página
- **Máximo**: 100 resultados por página
- **Default**: 50 resultados por página

---

## Códigos de País (ISO 3166-1 alpha-2)

El campo `country` debe ser un código de país ISO 3166-1 alpha-2 válido (2 letras mayúsculas).

### Ejemplos Comunes:

| Código | País |
|--------|------|
| CL | Chile |
| MX | México |
| AR | Argentina |
| CO | Colombia |
| PE | Perú |
| BR | Brasil |
| ES | España |
| US | Estados Unidos |
| CA | Canadá |
| UK | Reino Unido |

**Lista completa:** [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa (GET) |
| 201 | Recurso creado exitosamente (POST) |
| 400 | Datos inválidos o mal formados |
| 401 | No autenticado o token inválido |
| 403 | No autorizado - Rol insuficiente |
| 404 | Recinto no encontrado |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno del servidor |

---

## Reglas de Negocio

### Creación de Recintos

1. Solo usuarios con rol `organizador` o `super_admin` pueden crear recintos
2. Todos los campos son obligatorios
3. La capacidad debe ser un número entero positivo mayor a 0
4. El código de país debe ser válido según ISO 3166-1 alpha-2
5. Los recintos se crean con `deletedAt = null` (activos)

### Listado de Recintos

1. Solo usuarios con rol `organizador`, `admin` o `super_admin` pueden listar recintos
2. Los recintos eliminados (soft delete) NO aparecen en el listado
3. La búsqueda por nombre es case-sensitive y busca coincidencias parciales
4. El filtro por ciudad debe ser exacto (case-sensitive)
5. Los resultados están paginados con un máximo de 100 por página

### Consulta de Recinto por ID

1. Solo usuarios con rol `organizador`, `admin` o `super_admin` pueden consultar
2. Retorna 404 si el recinto no existe o fue eliminado (soft delete)
3. El ID debe ser un UUID válido

---

## Seguridad

### Autenticación JWT

Todos los endpoints requieren autenticación JWT mediante Bearer token:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autorización por Roles

| Endpoint | Roles Permitidos |
|----------|------------------|
| `POST /venues` | organizer, super_admin |
| `GET /venues` | organizer, admin, super_admin |
| `GET /venues/:id` | organizer, admin, super_admin |

**Nota:** Los clientes NO tienen acceso a ningún endpoint de venues.

### Rate Limiting

- **Límite Global**: 100 requests por minuto por IP
- **Headers informativos**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1705320000000
  ```

### Validación de Entrada

- Todos los DTOs son validados con `class-validator`
- Los inputs se sanitizan para prevenir inyección HTML
- Los códigos de país se validan con expresión regular: `^[A-Z]{2}$`

---

## Ejemplos de Flujos Completos

### Flujo 1: Crear y Consultar Recinto

```bash
# 1. Login como organizador
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "Password123!"
  }'

# Respuesta incluye accessToken
# {
#   "user": { ... },
#   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
#   "refreshToken": "..."
# }

# 2. Crear nuevo recinto
curl -X POST http://localhost:3000/api/v1/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "name": "Estadio Nacional",
    "address": "Av. Grecia 2001, Ñuñoa",
    "city": "Santiago",
    "country": "CL",
    "capacity": 48665
  }'

# Respuesta incluye el ID del recinto creado
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "name": "Estadio Nacional",
#   ...
# }

# 3. Consultar el recinto creado
curl -X GET http://localhost:3000/api/v1/venues/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Flujo 2: Búsqueda y Filtrado

```bash
# 1. Listar todos los recintos de Santiago
curl -X GET "http://localhost:3000/api/v1/venues?city=Santiago" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 2. Buscar recintos que contengan "Teatro"
curl -X GET "http://localhost:3000/api/v1/venues?search=Teatro" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 3. Combinar filtros: Teatros en Santiago, ordenados por capacidad
curl -X GET "http://localhost:3000/api/v1/venues?city=Santiago&search=Teatro&sortBy=capacity&sortOrder=ASC" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 4. Paginar resultados: Segunda página, 10 por página
curl -X GET "http://localhost:3000/api/v1/venues?page=2&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Flujo 3: Manejo de Errores

```bash
# 1. Intentar crear recinto sin autenticación
curl -X POST http://localhost:3000/api/v1/venues \
  -H "Content-Type: application/json" \
  -d '{ "name": "Test Venue", ... }'
# Resultado: 401 Unauthorized

# 2. Intentar crear recinto como cliente
curl -X POST http://localhost:3000/api/v1/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-de-cliente>" \
  -d '{ "name": "Test Venue", ... }'
# Resultado: 403 Forbidden

# 3. Crear recinto con datos inválidos
curl -X POST http://localhost:3000/api/v1/venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-de-organizador>" \
  -d '{
    "name": "",
    "address": "Test Address",
    "city": "Santiago",
    "country": "Chile",
    "capacity": -100
  }'
# Resultado: 400 Bad Request con errores de validación

# 4. Consultar recinto que no existe
curl -X GET http://localhost:3000/api/v1/venues/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer <token-de-organizador>"
# Resultado: 404 Not Found
```

---

## Troubleshooting

### "Unauthorized"
- Verificar que el token JWT sea válido y no haya expirado
- Incluir el header `Authorization: Bearer <token>` en todas las peticiones
- Si el token expiró, usar el refresh token para obtener uno nuevo

### "Forbidden - User role does not have permission"
- Verificar que tu rol de usuario sea `organizador`, `admin` o `super_admin`
- Los clientes NO tienen acceso a este módulo
- Contactar al administrador para asignar el rol correcto

### "Venue not found"
- Verificar que el ID sea un UUID válido
- El recinto puede haber sido eliminado (soft delete)
- Verificar que el ID sea correcto

### "El código de país debe ser un código ISO 3166-1 alpha-2 válido"
- El campo `country` debe ser exactamente 2 letras MAYÚSCULAS
- Ejemplo correcto: `"CL"`, `"MX"`, `"AR"`
- Ejemplo incorrecto: `"Chile"`, `"cl"`, `"CHL"`

### "La capacidad debe ser mayor a 0"
- El campo `capacity` debe ser un número entero positivo
- Ejemplo correcto: `1500`, `10000`, `500`
- Ejemplo incorrecto: `0`, `-100`, `"mil"`

### Búsqueda no encuentra resultados
- La búsqueda por nombre es case-sensitive
- Buscar `"Teatro"` NO encontrará `"teatro"` (minúsculas)
- El filtro por ciudad debe ser exacto
- Verificar la ortografía y capitalización

---

## Casos de Uso

### Caso de Uso 1: Organizador Registra Nuevo Recinto

**Actor:** Organizador de eventos

**Flujo:**
1. El organizador inicia sesión y obtiene su token JWT
2. Crea un nuevo recinto con toda la información requerida
3. El sistema valida los datos y crea el recinto
4. El organizador puede consultar el recinto para verificar

**Beneficio:** El organizador puede registrar los lugares donde realizará sus eventos

### Caso de Uso 2: Admin Busca Recintos Disponibles

**Actor:** Administrador

**Flujo:**
1. El admin inicia sesión
2. Consulta la lista de todos los recintos con paginación
3. Filtra por ciudad para encontrar recintos en una ubicación específica
4. Busca por nombre para encontrar un recinto particular
5. Obtiene los detalles completos del recinto seleccionado

**Beneficio:** El admin puede supervisar y gestionar todos los recintos registrados

### Caso de Uso 3: Organizador Planifica Evento

**Actor:** Organizador de eventos

**Flujo:**
1. El organizador busca recintos disponibles en su ciudad
2. Filtra por capacidad usando parámetros de ordenamiento
3. Selecciona el recinto más adecuado para su evento
4. Consulta los detalles completos del recinto (dirección, capacidad)
5. Usa el ID del recinto al crear su evento

**Beneficio:** El organizador puede elegir el mejor recinto para su evento

---

## Integraciones Futuras

### Funcionalidades Planeadas

1. **Actualización de Recintos** (`PUT /venues/:id`)
   - Permitir a organizadores modificar recintos existentes
   - Solo el creador o super-admin puede actualizar

2. **Eliminación de Recintos** (`DELETE /venues/:id`)
   - Soft delete de recintos
   - Solo super-admin puede eliminar
   - Validar que no tenga eventos activos

3. **Imágenes de Recintos**
   - Upload de fotos del recinto
   - Galería de imágenes
   - Imagen principal destacada

4. **Información Adicional**
   - Descripción del recinto
   - Servicios disponibles (estacionamiento, accesibilidad, etc.)
   - Información de contacto
   - Ubicación GPS (latitud, longitud)

5. **Disponibilidad**
   - Calendario de disponibilidad
   - Bloqueo de fechas ocupadas
   - Integración con módulo de eventos

---

## Configuración

### Variables de Entorno

No hay variables específicas para el módulo de venues. Se usa la configuración general:

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
```

---

**Última actualización:** 2025-01-28
