# Módulo de Usuarios (Users)

## Descripción

El módulo de usuarios permite a los clientes autenticados gestionar su propio perfil, actualizar su información personal y cambiar su contraseña.

**Base URL:** `http://localhost:3000/api/v1/users`

---

## Endpoints

### 1. Obtener Perfil Actual

Obtiene el perfil del usuario autenticado actualmente.

**Endpoint:** `GET /users/me`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** Todos los usuarios autenticados

**cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "cliente@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678",
  "role": "cliente",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response 401 (Unauthorized - Token inválido o expirado):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

### 2. Actualizar Perfil Actual

Permite al usuario autenticado actualizar su propia información de perfil.

**Endpoint:** `PATCH /users/me`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** Todos los usuarios autenticados

**Request Body:**
```json
{
  "email": "nuevo@example.com",
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "phone": "+56987654321"
}
```

**Nota:** Todos los campos son opcionales. Solo envía los campos que deseas actualizar.

**Validaciones:**
- `email`: Debe ser un email válido si se proporciona
- `firstName`: Mínimo 2 caracteres si se proporciona
- `lastName`: Mínimo 2 caracteres si se proporciona
- `phone`: Formato internacional (+[código país][número]) si se proporciona

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "phone": "+56987654321"
  }'
```

**Response 200 (OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "cliente@example.com",
  "firstName": "Juan Carlos",
  "lastName": "Pérez",
  "phone": "+56987654321",
  "role": "cliente",
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T15:45:00.000Z"
}
```

**Response 400 (Bad Request - Validación):**
```json
{
  "statusCode": 400,
  "message": [
    "Email debe ser válido",
    "firstName debe tener al menos 2 caracteres"
  ],
  "error": "Bad Request"
}
```

**Response 401 (Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Response 409 (Conflict - Email ya existe):**
```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

---

### 3. Cambiar Contraseña

Permite al usuario autenticado cambiar su propia contraseña.

**Endpoint:** `PATCH /users/me/password`

**Autenticación:** JWT requerido (Bearer token)

**Autorización:** Todos los usuarios autenticados

**Request Body:**
```json
{
  "currentPassword": "MiPassword123!",
  "newPassword": "NuevaPassword456!"
}
```

**Validaciones:**
- `currentPassword`: Requerido, debe coincidir con la contraseña actual
- `newPassword`: Requerido, debe cumplir con los requisitos de seguridad:
  - Mínimo 8 caracteres
  - Al menos 1 letra mayúscula (A-Z)
  - Al menos 1 letra minúscula (a-z)
  - Al menos 1 número (0-9)
  - Al menos 1 carácter especial (!@#$%^&*()_+-=[]{};'"\\|,.<>/?)

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/users/me/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "MiPassword123!",
    "newPassword": "NuevaPassword456!"
  }'
```

**Response 200 (OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Response 400 (Bad Request - Password débil):**
```json
{
  "statusCode": 400,
  "message": [
    "La nueva contraseña debe tener al menos 8 caracteres",
    "La nueva contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial"
  ],
  "error": "Bad Request"
}
```

**Response 401 (Unauthorized - Contraseña actual incorrecta):**
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect",
  "error": "Unauthorized"
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

## Autenticación

Todos los endpoints en este módulo requieren autenticación JWT. Debes incluir el access token en el header de autorización:

```
Authorization: Bearer {access_token}
```

El access token se obtiene al:
1. Registrarse (POST /auth/register)
2. Iniciar sesión (POST /auth/login)
3. Renovar el token (POST /auth/refresh)

Ver [AUTH.md](./AUTH.md) para más detalles sobre autenticación.

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 400 | Datos inválidos o mal formados |
| 401 | No autenticado o token inválido |
| 409 | Conflicto (ej: email ya en uso) |
| 500 | Error interno del servidor |

---

## Reglas de Negocio

### Actualización de Perfil
1. Los usuarios solo pueden actualizar su propio perfil
2. No pueden cambiar su rol (`role`)
3. No pueden cambiar su estado (`isActive`)
4. El email debe ser único en el sistema
5. Todos los campos en PATCH /me son opcionales

### Cambio de Contraseña
1. Debe proporcionar la contraseña actual correcta
2. La nueva contraseña debe cumplir con todos los requisitos de seguridad
3. La nueva contraseña no puede ser igual a la actual
4. Después del cambio, los refresh tokens antiguos siguen siendo válidos

---

## Ejemplos de Flujos Completos

### Flujo de Actualización de Perfil

```bash
# 1. Login para obtener el access token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "MiPassword123!"
  }'

# Respuesta incluye accessToken

# 2. Obtener perfil actual
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Actualizar perfil
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "phone": "+56987654321"
  }'
```

### Flujo de Cambio de Contraseña

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "MiPassword123!"
  }'

# 2. Cambiar contraseña
curl -X PATCH http://localhost:3000/api/v1/users/me/password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "MiPassword123!",
    "newPassword": "NuevaPassword456!"
  }'

# 3. Login con la nueva contraseña
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "NuevaPassword456!"
  }'
```

---

## Seguridad

### Protección de Datos
- La contraseña nunca se incluye en las respuestas de la API
- Solo el usuario autenticado puede ver y modificar su propio perfil
- El cambio de contraseña requiere verificación de la contraseña actual

### Validación de Email
- El email debe ser único en todo el sistema
- Se valida el formato antes de aceptar cambios

### Requisitos de Contraseña
Las contraseñas deben cumplir:
- Mínimo 8 caracteres
- Al menos 1 letra mayúscula (A-Z)
- Al menos 1 letra minúscula (a-z)
- Al menos 1 número (0-9)
- Al menos 1 carácter especial (!@#$%^&*()_+-=[]{};'"\\|,.<>/?)

**Ejemplo válido:** `MiPassword123!`

---

## Troubleshooting

### "Unauthorized"
- Verificar que el access token sea válido y no haya expirado
- Si expiró, usar el refresh token para obtener uno nuevo (POST /auth/refresh)
- Verificar que el header Authorization esté en formato: `Bearer {token}`

### "Email already in use"
- El email que intentas usar ya está registrado por otro usuario
- Intenta con un email diferente

### "Current password is incorrect"
- La contraseña actual proporcionada no coincide con la almacenada
- Verifica que estés usando la contraseña correcta
- Si olvidaste tu contraseña, usa el flujo de recuperación (POST /auth/forgot-password)

### "La nueva contraseña debe..."
- La nueva contraseña no cumple con los requisitos de seguridad
- Asegúrate de incluir mayúsculas, minúsculas, números y caracteres especiales
- La contraseña debe tener al menos 8 caracteres

---

**Última actualización:** 2025-01-20
