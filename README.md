# eventpass

Plataforma de Venta de Boletos

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Desarrollo](#-desarrollo)
- [Migraciones de Base de Datos](#-migraciones-de-base-de-datos)
- [Testing](#-testing)
- [Docker](#-docker)
- [Documentación API](#-documentación-api)
- [Seguridad](#-seguridad)
- [Métricas y Monitoreo](#-métricas-y-monitoreo)

## 🚀 Características

### Seguridad

- ✅ Autenticación JWT con refresh tokens
- ✅ Validación de API Key/Secret
- ✅ Rate limiting personalizado
- ✅ Helmet para seguridad de headers HTTP
- ✅ CORS configurable
- ✅ Sanitización de inputs
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Validación robusta de contraseñas

### Rendimiento

- ✅ Caché en memoria (cache-manager)
- ✅ Compresión de respuestas HTTP
- ✅ Clustering para multi-core
- ✅ Connection pooling de base de datos

### Observabilidad

- ✅ Logging estructurado (Winston) con 6 archivos de logs
- ✅ Request/Response logging automático con correlation IDs
- ✅ Security audit trail (26 tipos de eventos de seguridad)
- ✅ Health checks (Terminus)
- ✅ Métricas Prometheus
- ✅ Documentación Swagger/OpenAPI completa

### Desarrollo

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Hot reload
- ✅ Testing completo (Jest) - 539 tests, 94.47% coverage
- ✅ E2E Security tests (39+ tests)
- ✅ Performance testing (Artillery)
- ✅ Migraciones TypeORM
- ✅ Docker multi-stage build
- ✅ Git hooks con Husky (pre-commit, commit-msg)

## 🛠 Tecnologías

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 22.x
- **Lenguaje**: TypeScript 5.x
- **Base de Datos**: PostgreSQL (con TypeORM 0.3.x)
- **Cache**: Redis (cache-manager + Bull queues)
- **Autenticación**: Passport + JWT
- **Pagos**: Stripe
- **Email**: Nodemailer + Handlebars templates
- **Validación**: class-validator + class-transformer
- **Sanitización**: sanitize-html
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest (Unit + Integration + E2E)
- **Performance Testing**: Artillery
- **Logging**: Winston (6 archivos de logs)
- **Métricas**: Prometheus
- **Jobs**: Bull (background jobs con Redis)
- **Seguridad**: Helmet + Rate Limiting (Throttler)

## 📦 Requisitos Previos

- Node.js >= 22.14.0
- npm >= 10.x
- PostgreSQL >= 13 (base de datos)
- Redis >= 6.0 (cache y jobs)
- Docker (opcional, pero recomendado)

## 🔧 Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd eventpass

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

## ⚙️ Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# App
NODE_ENV=development
APP_NAME=eventpass
PORT=3000
API_KEY=543439f3c5b9a56962691b270c2ca3ac
API_SECRET=d1ed61830e402ee6c3c96b1c43bc52b72fbf6c69a16ecfab
JWT_SECRET=6036e29961e12673235e3989e7bade023c1ebe80aea7734e9900974f1e181df2
JWT_EXPIRES_IN=1d

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=eventpass_dev
DB_SSL=false

# Seguridad
ALLOWED_ORIGINS=http://localhost:3000
JWT_REFRESH_SECRET=c5d160cb9433880412db6a9f7834697e64f1e1ebd76fa198286b65f94b0008d6
JWT_REFRESH_EXPIRES_IN=7d

# Performance
CACHE_TTL=300
CACHE_MAX_ITEMS=100
CLUSTER_WORKERS=auto

# Database Pool
DB_POOL_SIZE=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_ENABLED=true

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
THROTTLE_LOGIN_LIMIT=5
THROTTLE_FORGOT_PASSWORD_LIMIT=3

# Logging
LOG_LEVEL=info

# Stripe (Pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd

# Email (SMTP)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASS=your-app-password
EMAIL_FROM_NAME=EventPass
EMAIL_FROM_ADDRESS=noreply@eventpass.com

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Jobs Configuration
BOOKING_EXPIRATION_TIME=10
CLEANUP_EXPIRED_BOOKINGS_INTERVAL=5
COMPLETE_PAST_EVENTS_TIME=02:00
```

## 📁 Estructura del Proyecto

```
eventpass/
├── src/
│   ├── common/                    # Código compartido
│   │   ├── cache/                # Configuración de caché
│   │   ├── controllers/          # Controllers compartidos (CSP report)
│   │   ├── decorators/           # Decoradores personalizados
│   │   ├── email/                # Servicio de email (Nodemailer)
│   │   ├── guards/               # Guards (JWT, Rate Limit, Roles)
│   │   ├── filters/              # Exception filters
│   │   ├── interceptors/         # Interceptores HTTP
│   │   ├── logger/               # Logging y security audit
│   │   ├── metrics/              # Módulo de métricas Prometheus
│   │   ├── middleware/           # Middlewares (Security, API Key, Request Logging)
│   │   ├── pipes/                # Pipes de validación y sanitización
│   │   ├── redis/                # Redis lock service
│   │   └── utils/                # Utilidades (password, etc.)
│   │
│   ├── config/                   # Configuraciones
│   │   ├── app.config.ts         # Config general de la app
│   │   ├── database.config.ts    # Config de TypeORM (NestJS)
│   │   ├── typeorm.config.ts     # Config de TypeORM (CLI)
│   │   ├── logger.config.ts      # Config de Winston
│   │   └── security.config.ts    # Config de seguridad
│   │
│   ├── database/                 # Base de datos
│   │   └── migrations/           # Migraciones TypeORM
│   │
│   ├── modules/                  # Módulos de negocio
│   │   ├── analytics/            # Analytics y dashboards
│   │   ├── auth/                 # Autenticación y autorización
│   │   │   ├── dto/              # DTOs de autenticación
│   │   │   ├── strategies/       # Estrategias Passport (JWT, Refresh)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── bookings/             # Gestión de reservas/bookings
│   │   ├── events/               # Gestión de eventos
│   │   ├── health/               # Health checks
│   │   │   ├── health.controller.ts
│   │   │   ├── advanced-health.controller.ts
│   │   │   └── health.module.ts
│   │   │
│   │   ├── jobs/                 # Background jobs (Bull)
│   │   ├── payments/             # Pagos con Stripe
│   │   ├── users/                # Gestión de usuarios
│   │   │   ├── dto/              # DTOs de usuarios
│   │   │   ├── entities/         # Entidades TypeORM
│   │   │   ├── repositories/     # Repositorios personalizados
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   └── venues/               # Gestión de recintos
│   │
│   ├── shared/                   # Interfaces y tipos compartidos
│   │   └── interfaces/
│   │
│   ├── app.module.ts             # Módulo principal
│   ├── main.ts                   # Punto de entrada
│   └── cluster.ts                # Configuración de clustering
│
├── test/                         # Tests
│   ├── e2e/                      # Tests End-to-End (39+ tests)
│   │   ├── bookings/             # E2E de bookings y pagos
│   │   └── security/             # E2E de seguridad (rate limiting, headers)
│   ├── integration/              # Tests de integración
│   └── unit/                     # Tests unitarios (539 tests)
│       ├── common/               # Tests de common (guards, middleware, services)
│       ├── config/               # Tests de configuración
│       └── modules/              # Tests de módulos de negocio
│
├── docs/                         # Documentación completa (11 archivos)
│   ├── ANALYTICS.md              # API de analytics
│   ├── AUTH.md                   # API de autenticación
│   ├── BOOKINGS.md               # API de reservas
│   ├── EVENTS.md                 # API de eventos
│   ├── LOGGING.md                # Guía de logging y security audit
│   ├── PAYMENTS.md               # API de pagos Stripe
│   ├── PERFORMANCE-TESTING.md    # Guía de performance testing
│   ├── RATE-LIMITING.md          # Guía de rate limiting
│   ├── RESUMEN-FINAL-TESTING.md  # Resumen ejecutivo de testing
│   ├── SECURITY-TESTING.md       # Guía de seguridad OWASP
│   └── VENUES.md                 # API de recintos
│
├── logs/                         # Logs de la aplicación (6 archivos)
│   ├── combined.log              # Todos los logs
│   ├── error.log                 # Solo errores
│   ├── security-audit.log        # Eventos de seguridad
│   ├── requests.log              # HTTP requests/responses
│   ├── exceptions.log            # Excepciones no capturadas
│   └── rejections.log            # Promise rejections
│
├── artillery.yml                 # Config de load testing
├── artillery-smoke.yml           # Config de smoke testing
├── .dockerignore                 # Exclusiones de Docker
├── .env                          # Variables de entorno (no committed)
├── .env.example                  # Ejemplo de variables de entorno
├── .gitignore                    # Exclusiones de Git
├── .husky/                       # Git hooks
├── .prettierrc                   # Configuración Prettier
├── commitlint.config.js          # Configuración de commitlint
├── Dockerfile                    # Imagen Docker multi-stage
├── eslint.config.mjs             # Configuración ESLint
├── nest-cli.json                 # Configuración NestJS CLI
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración TypeScript
└── tsconfig.build.json           # Configuración TypeScript para build
```

## 💻 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run start:dev

# Modo debug
npm run start:debug

# Producción
npm run build
npm run start:prod

# Linting y formato
npm run format

# Testing
npm run test              # Unit tests
npm run test:unit:cov     # Unit tests con coverage
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests
npm run test:all          # Todos los tests

# Performance Testing
npm run perf:smoke        # Smoke test (2 minutos)
npm run perf:test         # Load test completo (12 minutos)

# Linting y commits
npm run lint              # Verificar código
npm run lint:fix          # Arreglar código automáticamente
npm run format            # Formatear con Prettier
```

### Crear Nuevos Módulos

```bash
# Generar módulo completo
nest g module modules/nombre-modulo
nest g controller modules/nombre-modulo
nest g service modules/nombre-modulo

# Generar entidad
nest g class modules/nombre-modulo/entities/nombre.entity --no-spec

# Generar DTO
nest g class modules/nombre-modulo/dto/create-nombre.dto --no-spec
```

## 🗄 Migraciones de Base de Datos

### Generar Migración

Después de crear/modificar entidades:

```bash
npm run migration:generate
```

Esto creará una migración en `src/database/migrations/` con los cambios detectados.

### Ejecutar Migraciones

```bash
npm run migration:run
```

### Revertir Última Migración

```bash
npm run migration:revert
```

### Crear Migración Vacía

```bash
npm run typeorm -- migration:create ./src/database/migrations/NombreMigracion
```

## 🧪 Testing

EventPass cuenta con una suite completa de tests con **94.47% de coverage**.

### Métricas de Testing

- **Total de tests**: 539 tests
- **Test Suites**: 26 suites
- **Coverage**: 94.47% statements
- **Tests E2E de Seguridad**: 39+ tests
- **Tests de Performance**: Artillery (smoke + load)

### Comandos de Testing

```bash
# Unit tests (539 tests)
npm run test
npm run test:unit:cov     # Con coverage report

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Todos los tests
npm run test:all

# Watch mode
npm run test:watch

# Performance testing
npm run perf:smoke        # Smoke test (2 min)
npm run perf:test         # Load test completo (12 min)
npm run perf:report       # Load test con reporte HTML
```

### Cobertura por Módulo

| Módulo | Coverage | Estado |
|--------|----------|--------|
| common/guards | 100% | ✅ Perfecto |
| common/email | 99.05% | ✅ Excelente |
| modules/auth | 100% | ✅ Perfecto |
| modules/venues | 100% | ✅ Perfecto |
| modules/events | 99.06% | ✅ Excelente |
| modules/analytics | 98.31% | ✅ Excelente |
| modules/users | 95.02% | ✅ Excelente |
| modules/payments | 90.90% | ✅ Excelente |
| common/redis | 92.85% | ✅ Excelente |
| modules/bookings | 88.37% | ✅ Bueno |

Para más detalles, ver [docs/RESUMEN-FINAL-TESTING.md](docs/RESUMEN-FINAL-TESTING.md)
```

## 🐳 Docker

### Build de la Imagen

```bash
docker build -t eventpass .
```

### Ejecutar Contenedor

```bash
docker run -p 3000:3000 --env-file .env eventpass
```

## 📚 Documentación API

### Swagger UI

Una vez iniciada la aplicación, accede a:

```
http://localhost:3000/api
```

### Documentación Completa con Ejemplos

Para ver la documentación completa de la API con ejemplos de curl, request bodies y responses, consulta los siguientes documentos por módulo:

#### API Endpoints

- **[🔐 Autenticación (AUTH.md)](docs/AUTH.md)** - Registro, login, refresh tokens, recuperación de contraseña
- **[👤 Usuarios (USERS.md)](docs/USERS.md)** - Gestión de perfil de usuario, actualización de datos, cambio de contraseña
- **[⚙️ Administración (ADMIN.md)](docs/ADMIN.md)** - Gestión de usuarios (crear, listar, actualizar, activar/desactivar, eliminar, restaurar)
- **[🏛️ Recintos (VENUES.md)](docs/VENUES.md)** - Gestión de recintos/lugares para eventos (crear, listar, consultar)
- **[🎫 Eventos (EVENTS.md)](docs/EVENTS.md)** - Gestión completa de eventos (crear, listar, actualizar, cancelar)
- **[🎟️ Reservas (BOOKINGS.md)](docs/BOOKINGS.md)** - Gestión de reservas de boletos
- **[💳 Pagos (PAYMENTS.md)](docs/PAYMENTS.md)** - Integración con Stripe, webhooks, procesamiento de pagos
- **[📊 Analytics (ANALYTICS.md)](docs/ANALYTICS.md)** - Dashboards, métricas de eventos, ventas

#### Seguridad y Testing

- **[🛡️ Seguridad (SECURITY-TESTING.md)](docs/SECURITY-TESTING.md)** - Guía completa de seguridad OWASP Top 10
- **[⚡ Performance Testing (PERFORMANCE-TESTING.md)](docs/PERFORMANCE-TESTING.md)** - Guía de pruebas de carga con Artillery
- **[🚦 Rate Limiting (RATE-LIMITING.md)](docs/RATE-LIMITING.md)** - Guía de implementación de rate limiting
- **[📝 Logging (LOGGING.md)](docs/LOGGING.md)** - Logging y security audit trail
- **[✅ Resumen Testing (RESUMEN-FINAL-TESTING.md)](docs/RESUMEN-FINAL-TESTING.md)** - Resumen ejecutivo de testing

Cada documento incluye:
- ✅ Ejemplos de curl para cada endpoint
- ✅ Request bodies con datos de ejemplo
- ✅ Responses con todos los códigos de estado
- ✅ Guía de roles y permisos
- ✅ Validaciones y formatos requeridos
- ✅ Flujos completos de ejemplo
- ✅ Troubleshooting y solución de problemas

### Autenticación en Swagger

La API soporta tres métodos de autenticación:

1. **Bearer Token (JWT)**
   - Login: `POST /auth/login`
   - Usar el token en header: `Authorization: Bearer <token>`

2. **API Key**
   - Header: `x-api-key: <your-api-key>`

3. **API Secret**
   - Header: `x-api-secret: <your-api-secret>`

### Endpoints Disponibles

#### Autenticación (`/auth`)
- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Renovar access token
- `POST /auth/forgot-password` - Solicitar reset de contraseña
- `POST /auth/reset-password` - Resetear contraseña con token

#### Usuarios (`/users`)
- `GET /users/me` - Obtener perfil actual
- `PATCH /users/me` - Actualizar perfil actual
- `PATCH /users/me/password` - Cambiar contraseña

#### Administración (`/admin/users`)
- `GET /admin/users` - Listar usuarios (con paginación y filtros)
- `POST /admin/users` - Crear organizador/admin
- `GET /admin/users/:id` - Obtener usuario por ID
- `PUT /admin/users/:id` - Actualizar usuario
- `DELETE /admin/users/:id` - Eliminar usuario (soft delete)
- `PATCH /admin/users/:id/activate` - Activar usuario
- `PATCH /admin/users/:id/deactivate` - Desactivar usuario
- `PATCH /admin/users/:id/restore` - Restaurar usuario eliminado

## 🔒 Seguridad

### Headers de Seguridad

El proyecto usa Helmet para configurar headers HTTP seguros:

- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security

### Rate Limiting

**Protección Global Activa:**

- ✅ Aplicado a **TODAS** las rutas automáticamente
- **Límite**: 100 requests por minuto por IP
- **Headers informativos**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Tracking inteligente**: Considera IPs detrás de proxies (nginx, cloudflare, etc.)

**Configuración** (`.env`):

```env
THROTTLE_TTL=60000    # 1 minuto en ms
THROTTLE_LIMIT=100    # 100 requests máximo
```

**Respuesta cuando se excede:**

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests"
}
```

### Validación de Contraseñas

Las contraseñas deben cumplir:

- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial

### API Keys

**Rutas públicas** (No requieren API Key):

- `/health` - Health check básico
- `/metrics` - Métricas Prometheus

**Rutas que requieren API Key + API Secret**:

- `/auth/login` - Login de usuario

**Rutas protegidas** (Requieren JWT + API Key):

- Todas las demás rutas

## 📊 Métricas y Monitoreo

### Health Checks

```bash
# Health check básico
GET /health

# Health check avanzado (database, memoria, disco)
GET /health/advanced
```

### Métricas Prometheus

```bash
GET /metrics
```

Métricas disponibles:

- HTTP request duration
- HTTP request total
- Active connections
- Memory usage
- CPU usage

### Logs

EventPass implementa un sistema completo de logging con Winston:

**Archivos de logs:**
- `logs/combined.log` - Todos los logs de la aplicación
- `logs/error.log` - Solo errores con stack traces
- `logs/security-audit.log` - Eventos de seguridad (login, pagos, access control)
- `logs/requests.log` - HTTP requests/responses con tiempos
- `logs/exceptions.log` - Excepciones no capturadas
- `logs/rejections.log` - Promise rejections

**Características:**
- ✅ Request/Response logging automático
- ✅ Correlation IDs para trazabilidad
- ✅ Security audit trail (26 tipos de eventos)
- ✅ Log rotation automático (maxsize + maxFiles)
- ✅ Formato JSON estructurado
- ✅ Niveles configurables (error, warn, info, http, debug)

**Configuración:**
```bash
LOG_LEVEL=info  # Nivel de log (ver .env.example)
```

Para más detalles, ver [docs/LOGGING.md](docs/LOGGING.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

MIT

## 👥 Autores

LACA-SOFT

## 📞 Soporte

Para reportar bugs o solicitar features, por favor crea un issue en el repositorio.
