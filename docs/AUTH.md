# Módulo de Autenticación (Auth)

## Descripción

El módulo de autenticación maneja el registro, login, renovación de tokens y recuperación de contraseñas para todos los usuarios del sistema.

**Base URL:** `http://localhost:3000/api/v1/auth`

---

## Endpoints

### 1. Registro de Usuario

Permite a nuevos usuarios registrarse en el sistema como clientes.

**Endpoint:** `POST /auth/register`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "cliente@example.com",
  "password": "MiPassword123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+56912345678"
}
```

**Validaciones:**
- `email`: Email válido, único en el sistema
- `password`: Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
- `firstName`: Requerido, mínimo 2 caracteres
- `lastName`: Requerido, mínimo 2 caracteres
- `phone`: Formato internacional (+[código país][número])

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "MiPassword123!",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+56912345678"
  }'
```

**Response 201 (Created):**
```json
{
  "user": {
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
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImNsaWVudGVAZXhhbXBsZS5jb20iLCJyb2xlIjoiY2xpZW50ZSIsImlhdCI6MTcwNTMxNzAwMCwiZXhwIjoxNzA1NDAzNDAwfQ.signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MDUzMTcwMDAsImV4cCI6MTcwNTkyMTgwMH0.signature"
}
```

**Response 409 (Conflict - Email ya existe):**
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**Response 400 (Bad Request - Validación):**
```json
{
  "statusCode": 400,
  "message": [
    "Email debe ser válido",
    "La contraseña debe tener al menos 8 caracteres",
    "La contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial"
  ],
  "error": "Bad Request"
}
```

---

### 2. Login

Permite a usuarios existentes iniciar sesión en el sistema.

**Endpoint:** `POST /auth/login`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "cliente@example.com",
  "password": "MiPassword123!"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "MiPassword123!"
  }'
```

**Response 200 (OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "cliente@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "cliente",
    "isActive": true,
    "mustChangePassword": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401 (Unauthorized - Credenciales inválidas):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Response 401 (Unauthorized - Usuario inactivo):**
```json
{
  "statusCode": 401,
  "message": "User account is inactive",
  "error": "Unauthorized"
}
```

---

### 3. Refresh Token

Renueva el access token usando el refresh token proporcionado.

**Endpoint:** `POST /auth/refresh`

**Autenticación:** Refresh Token requerido

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response 200 (OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newAccessToken...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newRefreshToken..."
}
```

**Response 401 (Unauthorized - Token inválido o expirado):**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired refresh token",
  "error": "Unauthorized"
}
```

---

### 4. Solicitar Reset de Contraseña

Envía un email con un enlace para resetear la contraseña.

**Endpoint:** `POST /auth/forgot-password`

**Autenticación:** No requerida (público)

**Request Body:**
```json
{
  "email": "cliente@example.com"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com"
  }'
```

**Response 200 (OK):**
```json
{
  "message": "Password reset email sent successfully"
}
```

**Nota:** Por seguridad, siempre retorna 200 incluso si el email no existe en el sistema.

**Response 400 (Bad Request - Email inválido):**
```json
{
  "statusCode": 400,
  "message": ["Email debe ser válido"],
  "error": "Bad Request"
}
```

---

### 5. Reset de Contraseña

Resetea la contraseña usando el token recibido por email.

**Endpoint:** `POST /auth/reset-password`

**Autenticación:** Token de reset requerido (recibido por email)

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.resetToken...",
  "newPassword": "NuevaPassword123!"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.resetToken...",
    "newPassword": "NuevaPassword123!"
  }'
```

**Response 200 (OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Response 400 (Bad Request - Token inválido o expirado):**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired reset token",
  "error": "Bad Request"
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

---

## Información de Tokens

### Access Token
- **Expiración:** 15 minutos (configurable en `.env`)
- **Uso:** Debe incluirse en el header `Authorization: Bearer {token}` para todas las peticiones autenticadas
- **Payload:** Contiene `sub` (userId), `email`, `role`

### Refresh Token
- **Expiración:** 7 días (configurable en `.env`)
- **Uso:** Usado para obtener un nuevo access token cuando este expira
- **Almacenamiento:** Debe guardarse de forma segura en el cliente (httpOnly cookie recomendado)

### Reset Token
- **Expiración:** 1 hora
- **Uso:** Una sola vez para resetear contraseña
- **Generación:** Automática al solicitar forgot-password

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Datos inválidos o mal formados |
| 401 | No autenticado o credenciales inválidas |
| 409 | Conflicto (ej: email ya existe) |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno del servidor |

---

## Reglas de Negocio

### Registro
1. Los usuarios se registran automáticamente con rol `cliente`
2. El email debe ser único en el sistema
3. La contraseña se hashea con bcrypt antes de almacenarse
4. Se retornan access y refresh tokens inmediatamente

### Login
1. Se validan las credenciales contra la base de datos
2. El usuario debe estar activo (`isActive: true`)
3. Se genera un nuevo par de tokens en cada login
4. Los tokens antiguos siguen siendo válidos hasta su expiración

### Recuperación de Contraseña
1. Se genera un token especial con expiración de 1 hora
2. El token se envía por email al usuario
3. El token solo puede usarse una vez
4. Después del reset, los refresh tokens antiguos se invalidan

---

## Seguridad

### Rate Limiting
- **Registro:** 3 intentos por hora por IP
- **Login:** 5 intentos por 15 minutos por IP
- **Forgot Password:** 3 intentos por hora por IP

### Validación de Contraseñas
Las contraseñas deben cumplir:
- Mínimo 8 caracteres
- Al menos 1 letra mayúscula (A-Z)
- Al menos 1 letra minúscula (a-z)
- Al menos 1 número (0-9)
- Al menos 1 carácter especial (!@#$%^&*()_+-=[]{};"\\|,.<>/?)

**Ejemplo válido:** `MiPassword123!`

---

## Ejemplos de Flujos Completos

### Flujo de Registro y Login

```bash
# 1. Registro
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@example.com",
    "password": "Password123!",
    "firstName": "Nuevo",
    "lastName": "Usuario",
    "phone": "+56912345678"
  }'

# Respuesta incluye accessToken y refreshToken

# 2. Usar el accessToken para peticiones autenticadas
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Flujo de Renovación de Token

```bash
# Cuando el accessToken expire (después de 15 minutos)
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'

# Respuesta incluye nuevo accessToken y refreshToken
```

### Flujo de Recuperación de Contraseña

```bash
# 1. Solicitar reset
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com"
  }'

# 2. Usuario recibe email con token

# 3. Resetear contraseña con el token
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "newPassword": "NuevaPassword123!"
  }'
```

---

## Configuración

### Variables de Entorno

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## Troubleshooting

### "Invalid credentials"
- Verificar que el email y password sean correctos
- Verificar que el usuario esté activo en la base de datos

### "Token expired"
- El access token expiró, usar el refresh token para obtener uno nuevo
- Si el refresh token también expiró, hacer login nuevamente

### "Email already exists"
- El email ya está registrado en el sistema
- Intentar login o recuperación de contraseña

### "Invalid or expired refresh token"
- El refresh token ha expirado (después de 7 días)
- Hacer login nuevamente para obtener nuevos tokens

---

**Última actualización:** 2025-01-20
