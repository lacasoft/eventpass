# Módulo de Administración de Usuarios (Admin)

## Descripción

El módulo de administración permite a usuarios con roles de `admin` y `super_admin` gestionar todos los usuarios del sistema, incluyendo creación, actualización, activación/desactivación, eliminación y restauración.

**Base URL:** `http://localhost:3000/api/v1/admin/users`

---

## Endpoints

### 1. Listar Todos los Usuarios

Lista todos los usuarios del sistema con soporte para paginación, filtrado y búsqueda.

**Endpoint:** `GET /admin/users`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Query Parameters:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| page | number | No | 1 | Número de página |
| limit | number | No | 50 | Cantidad de resultados por página |
| role | string | No | - | Filtrar por rol: `cliente`, `organizer`, `admin`, `super_admin` |
| status | string | No | - | Filtrar por estado: `active`, `inactive`, `suspended` |
| search | string | No | - | Búsqueda por email, firstName o lastName |
| sortBy | string | No | createdAt | Campo para ordenar |
| sortOrder | string | No | DESC | Orden: `ASC` o `DESC` |

**cURL:**
```bash
# Listar todos los usuarios (página 1, 50 resultados)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por rol y estado
curl -X GET "http://localhost:3000/api/v1/admin/users?role=organizer&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Búsqueda con paginación
curl -X GET "http://localhost:3000/api/v1/admin/users?search=juan&page=2&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "organizer@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "phone": "+56912345678",
      "role": "organizer",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "cliente@example.com",
      "firstName": "María",
      "lastName": "García",
      "phone": "+56987654321",
      "role": "cliente",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2025-01-16T14:20:00.000Z",
      "updatedAt": "2025-01-16T14:20:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Response 403 (Forbidden - Permisos insuficientes):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: admin, super_admin",
  "error": "Forbidden"
}
```

---

### 2. Crear Usuario (Organizador o Admin)

Permite a un `super_admin` crear nuevos usuarios con roles de `organizer` o `admin`. Se genera una contraseña temporal que debe ser cambiada en el primer inicio de sesión.

**Endpoint:** `POST /admin/users`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** Solo `super_admin`

**Request Body:**
```json
{
  "email": "nuevo.organizer@example.com",
  "firstName": "Carlos",
  "lastName": "Rodríguez",
  "phone": "+56912345678",
  "role": "organizer"
}
```

**Validaciones:**
- `email`: Email válido, único en el sistema
- `firstName`: Requerido, mínimo 2 caracteres
- `lastName`: Requerido, mínimo 2 caracteres
- `phone`: Formato internacional (+[código país][número])
- `role`: Solo `organizer` o `admin` (no se puede crear `super_admin`)

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo.organizer@example.com",
    "firstName": "Carlos",
    "lastName": "Rodríguez",
    "phone": "+56912345678",
    "role": "organizer"
  }'
```

**Response 201 (Created):**
```json
{
  "user": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "nuevo.organizer@example.com",
    "firstName": "Carlos",
    "lastName": "Rodríguez",
    "phone": "+56912345678",
    "role": "organizer",
    "temporaryPassword": "Xk9mP2nQ7wR5tY8u",
    "mustChangePassword": true,
    "isActive": true,
    "createdAt": "2025-01-20T09:15:00.000Z",
    "updatedAt": "2025-01-20T09:15:00.000Z"
  }
}
```

**IMPORTANTE:** La `temporaryPassword` solo se muestra una vez en esta respuesta. Debe ser entregada al usuario para su primer inicio de sesión.

**Response 400 (Bad Request - Intento de crear super_admin):**
```json
{
  "statusCode": 400,
  "message": "Cannot create users with super_admin role",
  "error": "Bad Request"
}
```

**Response 403 (Forbidden - No es super_admin):**
```json
{
  "statusCode": 403,
  "message": "User role 'admin' does not have permission to access this resource. Required roles: super_admin",
  "error": "Forbidden"
}
```

**Response 409 (Conflict - Email ya existe):**
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

---

### 3. Obtener Usuario por ID

Obtiene los detalles de un usuario específico.

**Endpoint:** `GET /admin/users/:id`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "organizer@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "organizer",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Response 403 (Forbidden):**
```json
{
  "statusCode": 403,
  "message": "User role 'cliente' does not have permission to access this resource. Required roles: admin, super_admin",
  "error": "Forbidden"
}
```

---

### 4. Actualizar Usuario

Actualiza la información de un usuario. Solo `super_admin` puede actualizar otros admins o modificar roles.

**Endpoint:** `PUT /admin/users/:id`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**Request Body:**
```json
{
  "email": "actualizado@example.com",
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "phone": "+56987654321",
  "role": "admin"
}
```

**Nota:** Todos los campos son opcionales. Solo envía los que deseas actualizar.

**Reglas:**
- Solo `super_admin` puede cambiar el rol de un usuario
- Solo `super_admin` puede actualizar usuarios con rol `admin` o `super_admin`
- Los `admin` solo pueden actualizar usuarios con rol `cliente` u `organizer`

**cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "role": "admin"
  }'
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "organizer@example.com",
  "firstName": "Juan Carlos",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "admin",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T11:45:00.000Z"
}
```

**Response 403 (Forbidden - Admin intenta actualizar otro admin):**
```json
{
  "statusCode": 403,
  "message": "Only super_admin can update admin users",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

### 5. Eliminar Usuario (Soft Delete)

Elimina un usuario mediante soft delete. El usuario queda marcado como eliminado pero no se borra físicamente. Solo `super_admin` puede eliminar admins.

**Endpoint:** `DELETE /admin/users/:id`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**Reglas:**
- Solo `super_admin` puede eliminar usuarios con rol `admin` o `super_admin`
- Los `admin` solo pueden eliminar usuarios con rol `cliente` u `organizer`

**cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Response 403 (Forbidden - Admin intenta eliminar otro admin):**
```json
{
  "statusCode": 403,
  "message": "Only super_admin can delete admin users",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

### 6. Activar Usuario

Activa un usuario que está inactivo. Solo `super_admin` puede activar admins.

**Endpoint:** `PATCH /admin/users/:id/activate`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/activate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "organizer@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "organizer",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T12:00:00.000Z"
}
```

**Response 403 (Forbidden - Admin intenta activar otro admin):**
```json
{
  "statusCode": 403,
  "message": "Only super_admin can modify admin users",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

### 7. Desactivar Usuario

Desactiva un usuario activo. Solo `super_admin` puede desactivar admins.

**Endpoint:** `PATCH /admin/users/:id/deactivate`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/deactivate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "organizer@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "organizer",
  "isActive": false,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T12:15:00.000Z"
}
```

**Response 403 (Forbidden - Admin intenta desactivar otro admin):**
```json
{
  "statusCode": 403,
  "message": "Only super_admin can modify admin users",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

### 8. Restaurar Usuario Eliminado

Restaura un usuario que fue eliminado mediante soft delete. Solo `super_admin` puede restaurar admins.

**Endpoint:** `PATCH /admin/users/:id/restore`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** `admin`, `super_admin`

**Path Parameters:**
- `id`: UUID del usuario

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/restore \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "organizer@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "organizer",
  "isActive": true,
  "mustChangePassword": false,
  "deletedAt": null,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-20T12:30:00.000Z"
}
```

**Response 400 (Bad Request - Usuario no está eliminado):**
```json
{
  "statusCode": 400,
  "message": "User is not deleted",
  "error": "Bad Request"
}
```

**Response 403 (Forbidden - Admin intenta restaurar otro admin):**
```json
{
  "statusCode": 403,
  "message": "Only super_admin can restore admin users",
  "error": "Forbidden"
}
```

**Response 404 (Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

## Estados de Usuario

| Estado | Descripción | Filtro en GET |
|--------|-------------|---------------|
| **Active** | Usuario activo (`isActive: true`, `deletedAt: null`) | `status=active` |
| **Inactive** | Usuario inactivo (`isActive: false`, `deletedAt: null`) | `status=inactive` |
| **Suspended** | Usuario eliminado/suspendido (`deletedAt` no null) | `status=suspended` |

---

## Jerarquía de Permisos

### Super Admin
- Puede realizar **todas las operaciones** sobre cualquier usuario
- Único rol que puede:
  - Crear usuarios con rol `organizer` o `admin`
  - Modificar, activar, desactivar o eliminar usuarios `admin`
  - Cambiar roles de usuarios

### Admin
- Puede gestionar usuarios con rol `cliente` y `organizer`
- **No puede:**
  - Crear nuevos usuarios (POST)
  - Modificar usuarios con rol `admin` o `super_admin`
  - Cambiar roles de usuarios
  - Eliminar, activar o desactivar usuarios `admin`

### Organizer y Cliente
- No tienen acceso a ningún endpoint de administración
- Solo pueden gestionar su propio perfil mediante `/users/me`

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Usuario creado exitosamente |
| 400 | Datos inválidos o intento de operación no permitida |
| 401 | No autenticado o token inválido |
| 403 | Permisos insuficientes para la operación |
| 404 | Usuario no encontrado |
| 409 | Conflicto (ej: email ya existe) |
| 500 | Error interno del servidor |

---

## Ejemplos de Flujos Completos

### Flujo de Creación de Organizador

```bash
# 1. Super admin hace login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "SuperPassword123!"
  }'

# Respuesta incluye accessToken

# 2. Crear nuevo organizador
curl -X POST http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo.organizer@example.com",
    "firstName": "Carlos",
    "lastName": "Rodríguez",
    "phone": "+56912345678",
    "role": "organizer"
  }'

# Respuesta incluye temporaryPassword: "Xk9mP2nQ7wR5tY8u"

# 3. Nuevo organizador hace login con contraseña temporal
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo.organizer@example.com",
    "password": "Xk9mP2nQ7wR5tY8u"
  }'

# 4. Cambiar contraseña (obligatorio en primer login)
curl -X PATCH http://localhost:3000/api/v1/users/me/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Xk9mP2nQ7wR5tY8u",
    "newPassword": "MiNuevaPassword123!"
  }'
```

### Flujo de Búsqueda y Actualización

```bash
# 1. Listar todos los organizadores activos
curl -X GET "http://localhost:3000/api/v1/admin/users?role=organizer&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Buscar usuario específico por email
curl -X GET "http://localhost:3000/api/v1/admin/users?search=carlos@example.com" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Obtener detalles del usuario encontrado
curl -X GET http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 4. Actualizar información del usuario
curl -X PUT http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+56987654321"
  }'
```

### Flujo de Gestión de Estado

```bash
# 1. Desactivar usuario
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/deactivate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Verificar que el usuario está inactivo
curl -X GET http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Respuesta: "isActive": false

# 3. Reactivar usuario
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/activate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 4. Eliminar usuario (soft delete)
curl -X DELETE http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 5. Listar usuarios suspendidos
curl -X GET "http://localhost:3000/api/v1/admin/users?status=suspended" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 6. Restaurar usuario eliminado
curl -X PATCH http://localhost:3000/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/restore \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Seguridad

### Contraseñas Temporales
- Generadas automáticamente con 16 caracteres
- Incluyen mayúsculas, minúsculas, números y caracteres especiales
- Solo se muestran una vez en la respuesta de creación
- El usuario debe cambiarlas en el primer login (`mustChangePassword: true`)

### Protección de Datos
- Las contraseñas nunca se incluyen en las respuestas (excepto `temporaryPassword` en creación)
- Soft delete preserva los datos para auditoría
- Solo usuarios con permisos pueden acceder a estos endpoints

### Jerarquía de Permisos
- `admin` no puede modificar otros `admin` o `super_admin`
- Solo `super_admin` puede cambiar roles
- Previene escalación de privilegios no autorizada

---

## Troubleshooting

### "Forbidden - Required roles: super_admin"
- El endpoint POST /admin/users solo puede ser usado por super_admin
- Verifica que tu usuario tenga el rol correcto

### "Only super_admin can modify admin users"
- Intentaste modificar/eliminar/activar un usuario con rol admin sin ser super_admin
- Solo super_admin puede gestionar otros admins

### "Cannot create users with super_admin role"
- Intentaste crear un usuario con rol super_admin
- Los super_admin solo pueden ser creados directamente en la base de datos por seguridad

### "User not found"
- El ID proporcionado no existe en el sistema
- Verifica que el UUID sea correcto
- Si buscas un usuario eliminado, intenta con status=suspended en la lista

### "User is not deleted"
- Intentaste restaurar un usuario que no está eliminado
- Solo se pueden restaurar usuarios con deletedAt no null

---

## Paginación

La paginación en GET /admin/users sigue este formato:

**Request:**
```
GET /admin/users?page=2&limit=20
```

**Response Meta:**
```json
{
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

**Campos:**
- `page`: Página actual
- `limit`: Resultados por página
- `total`: Total de usuarios que coinciden con los filtros
- `totalPages`: Total de páginas disponibles
- `hasNextPage`: ¿Hay más páginas después?
- `hasPreviousPage`: ¿Hay páginas anteriores?

---

**Última actualización:** 2025-01-20
