# Performance Testing - EventPass

## Descripción General

Este documento describe la estrategia de performance testing para EventPass, incluyendo configuraciones de carga, métricas objetivo y guías de interpretación de resultados.

## Herramientas

Utilizamos **Artillery** como herramienta principal de performance testing por:
- Configuración simple con YAML
- Soporte para escenarios complejos
- Integración fácil con CI/CD
- Reportes detallados y visuales
- Open source y activamente mantenido

## Tipos de Tests Implementados

### 1. Smoke Test (artillery-smoke.yml)

**Propósito**: Verificación rápida de que el sistema responde correctamente bajo carga mínima.

**Duración**: 2 minutos

**Carga**: 5 usuarios/segundo

**Ejecutar**:
```bash
npm run perf:smoke
```

**Escenarios**:
- Health Check (20%) - Verificación de endpoints básicos
- Browse Events (40%) - Navegación pública de eventos y venues
- User Login (40%) - Autenticación de usuarios

**Umbrales de éxito**:
- Error rate máximo: 5%
- P95 latency: < 3000ms

**Cuándo usar**:
- Desarrollo local antes de commits
- Verificación rápida después de deployments
- Validación post-refactoring

### 2. Load Test Completo (artillery.yml)

**Propósito**: Validar el comportamiento del sistema bajo carga realista y extrema.

**Duración**: 12 minutos

**Fases de carga**:
1. **Warm-up** (1 min): 5 usuarios/seg - Preparación del sistema
2. **Ramp-up** (2 min): 10 → 30 usuarios/seg - Incremento gradual
3. **Sustained Load** (5 min): 30 usuarios/seg - Carga sostenida
4. **Spike** (1 min): 100 usuarios/seg - Pico de carga extremo
5. **Cool-down** (3 min): 10 usuarios/seg - Recuperación del sistema

**Ejecutar**:
```bash
npm run perf:test
```

**Ejecutar con reporte HTML**:
```bash
npm run perf:report
```

**Escenarios**:
- Browse Events - Public (40%) - Tráfico público sin autenticación
- User Registration/Login (20%) - Creación y autenticación de cuentas
- Booking Flow (30%) - Reserva y pago de tickets (crítico)
- Analytics Queries (10%) - Consultas de analytics por organizadores

**Umbrales de éxito**:
- Error rate máximo: 1%
- P95 latency: < 2000ms
- P99 latency: < 5000ms

**Cuándo usar**:
- Antes de releases importantes
- Validación de cambios en infraestructura
- Benchmarking de optimizaciones
- Tests de regresión de performance

## Escenarios Detallados

### Escenario 1: Browse Events - Public (40% del tráfico)

Simula usuarios navegando eventos públicamente sin autenticación.

**Flujo**:
1. GET /events - Lista de eventos
2. Pausa 2 segundos (think time)
3. GET /events/{eventId} - Detalles de evento
4. Pausa 2 segundos
5. GET /venues - Lista de venues
6. Pausa 1 segundo
7. GET /venues/{venueId} - Detalles de venue

**Métricas clave**:
- P95 < 1000ms (endpoints públicos deben ser rápidos)
- Cache hit rate alto esperado

### Escenario 2: User Registration/Login (20% del tráfico)

Simula creación de cuentas y login de usuarios.

**Flujo de Registro**:
1. POST /auth/register
2. Captura token de respuesta
3. GET /users/profile (con token)

**Flujo de Login**:
1. POST /auth/login
2. Captura token de respuesta
3. GET /users/profile (con token)

**Métricas clave**:
- P95 < 1500ms (operaciones con bcrypt son lentas)
- Tasa de éxito 100% esperada

### Escenario 3: Booking Flow (30% del tráfico)

**CRÍTICO** - Flujo completo de reserva y pago de tickets.

**Flujo**:
1. POST /auth/login - Autenticación
2. GET /events - Buscar eventos
3. GET /events/{eventId} - Ver detalles
4. POST /bookings/reserve - Crear reserva (CRÍTICO - usa locks)
5. Pausa 5 segundos (usuario revisa)
6. POST /payments/confirm - Confirmar pago con Stripe

**Métricas clave**:
- P95 < 3000ms (incluye procesamiento de pago)
- Error rate < 0.5% (crítico para negocio)
- Consistencia de stock (verificar manualmente con logs)

**Puntos críticos**:
- RedisLockService debe manejar concurrencia correctamente
- TypeORM transactions (SERIALIZABLE) pueden causar retries
- Stripe API puede tener latencia variable

### Escenario 4: Analytics Queries (10% del tráfico)

Simula organizadores consultando analytics de eventos.

**Flujo**:
1. POST /auth/login (como organizador)
2. GET /analytics/revenue?eventId={eventId}
3. GET /analytics/bookings?eventId={eventId}

**Métricas clave**:
- P95 < 2000ms (queries agregadas pueden ser lentas)
- Cache importante para optimización

## Métricas y Umbrales

### Métricas HTTP

| Métrica | Smoke Test | Load Test | Explicación |
|---------|-----------|-----------|-------------|
| **Error Rate** | < 5% | < 1% | Porcentaje de requests con status 4xx/5xx |
| **P50 (Mediana)** | < 1000ms | < 800ms | 50% de requests responden en este tiempo |
| **P95** | < 3000ms | < 2000ms | 95% de requests responden en este tiempo |
| **P99** | N/A | < 5000ms | 99% de requests (outliers) |
| **Request Rate** | 5 req/s | 30-100 req/s | Throughput del sistema |

### Métricas de Sistema (Monitoreo Manual)

Durante los tests, monitorear:

```bash
# CPU y Memoria
docker stats

# Conexiones a PostgreSQL
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Conexiones a Redis
redis-cli INFO clients

# Logs de aplicación
docker logs -f eventpass-api
```

**Umbrales esperados**:
- CPU: < 80% uso sostenido
- Memoria: < 70% del límite asignado
- DB Connections: < 50 activas (pool size 100)
- Redis Connections: < 20

## Interpretación de Resultados

### Ejemplo de Salida Exitosa

```
Summary report
--------------
http.codes.200: .................................................. 15000
http.codes.201: .................................................. 2000
http.codes.400: .................................................. 50
http.downloaded_bytes: ........................................... 50000000
http.request_rate: ............................................... 30/sec
http.requests: ................................................... 17050
http.response_time:
  min: ........................................................... 45
  max: ........................................................... 4850
  median: ........................................................ 520
  p95: ........................................................... 1850
  p99: ........................................................... 3200
http.responses: .................................................. 17050
vusers.completed: ................................................ 17000
vusers.created: .................................................. 17000
vusers.created_by_name.Browse Events - Public: ................... 6800
vusers.created_by_name.Booking Flow: ............................. 5100
```

**Análisis**:
- ✅ Error rate: 50/17050 = 0.3% (< 1%)
- ✅ P95: 1850ms (< 2000ms)
- ✅ P99: 3200ms (< 5000ms)
- ✅ Request rate estable a 30/sec

### Señales de Problema

#### 1. Error Rate Alto (> 1%)

**Posibles causas**:
- Database connection pool agotado
- Redis locks expirando (timeout muy corto)
- Stripe API intermitente
- Validaciones fallando

**Debugging**:
```bash
# Ver logs de errores
docker logs eventpass-api | grep ERROR

# Verificar conexiones DB
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### 2. Latencia Alta (P95 > 2000ms)

**Posibles causas**:
- N+1 queries en ORM
- Missing database indexes
- Cache no funcionando
- CPU/Memory saturados

**Debugging**:
```bash
# Analizar queries lentas
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Verificar cache hit rate
redis-cli INFO stats | grep keyspace
```

#### 3. Timeouts (P99 > 5000ms)

**Posibles causas**:
- Database locks (SERIALIZABLE isolation)
- Redis locks contention
- External API (Stripe) lento

**Debugging**:
- Revisar logs para "Sistema ocupado" (Redis lock failures)
- Analizar TypeORM transaction retries

## Configuración del Entorno

### Requisitos Previos

1. **Base de datos con datos de prueba**:
```bash
# Ejecutar migraciones
npm run migration:run

# Crear usuario admin
npm run seed:admin

# Poblar datos de prueba (eventos, venues)
# Ejecutar manualmente scripts de seed si existen
```

2. **Servicios levantados**:
```bash
# Docker compose
docker-compose up -d postgres redis

# Aplicación en modo producción
npm run build
npm run start:prod
```

3. **Variables de entorno**:
```bash
NODE_ENV=production
DATABASE_HOST=localhost
DATABASE_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=sk_test_...
```

### Configuración de Artillery

Las configuraciones están en:
- `artillery.yml` - Load test completo
- `artillery-smoke.yml` - Smoke test rápido

**Personalización común**:

```yaml
config:
  target: 'http://localhost:3000'  # Cambiar para staging/production
  phases:
    - duration: 300                # Duración en segundos
      arrivalRate: 30              # Usuarios por segundo
      rampTo: 100                  # Incrementar hasta X usuarios/seg

  ensure:
    maxErrorRate: 1                # % máximo de errores
    p95: 2000                      # P95 en milisegundos
    p99: 5000                      # P99 en milisegundos
```

## Integración con CI/CD

### GitHub Actions (Ejemplo)

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: eventpass_test
          POSTGRES_PASSWORD: test123

      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migration:run

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm run start:prod &

      - name: Wait for app to be ready
        run: sleep 10

      - name: Run smoke test
        run: npm run perf:smoke

      - name: Upload Artillery report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: artillery-report
          path: artillery-report.json
```

## Mejores Prácticas

### 1. Datos de Prueba

- **Usar datos realistas**: Eventos con diferentes capacidades, precios, fechas
- **Limpiar después**: Scripts para resetear DB entre runs
- **Aislar tests**: No ejecutar en DB de desarrollo

### 2. Análisis de Resultados

- **Baseline**: Establecer métricas baseline en primera ejecución exitosa
- **Comparar**: Usar artillery-compare para comparar runs
- **Tendencias**: Trackear métricas en el tiempo (Prometheus/Grafana)

### 3. Debugging

- **Logs detallados**: Aumentar logging durante performance tests
- **Métricas del sistema**: CPU, memoria, network
- **Database profiling**: pg_stat_statements, slow query log

### 4. Optimizaciones Comunes

Si los tests fallan, considerar:

1. **Incrementar pools**:
```typescript
// typeorm.config.ts
extra: {
  max: 100,  // Incrementar pool de conexiones
  min: 10,
}
```

2. **Ajustar Redis lock TTL**:
```typescript
// redis-lock.service.ts
async acquireLock(key: string, ttlMs: number = 10000) {  // De 5000 a 10000
```

3. **Optimizar queries**:
```typescript
// Añadir índices
@Index(['status', 'eventId'])  // Para queries frecuentes

// Eager loading
@ManyToOne(() => Event, { eager: true })
```

4. **Implementar caching**:
```typescript
@UseInterceptors(CacheInterceptor)
@CacheTTL(300)  // 5 minutos
async getEvents() { ... }
```

## Troubleshooting

### Error: ECONNREFUSED

**Problema**: Artillery no puede conectar al servidor.

**Solución**:
```bash
# Verificar que la app esté corriendo
curl http://localhost:3000/health

# Verificar puerto en artillery.yml
target: 'http://localhost:3000'
```

### Error: ETIMEDOUT

**Problema**: Requests excediendo timeout.

**Solución**:
```yaml
# Incrementar timeout en artillery.yml
config:
  timeout: 60  # Segundos
```

### Error: Too many open files

**Problema**: Sistema operativo limitando conexiones.

**Solución**:
```bash
# Linux/macOS
ulimit -n 10000

# Permanente en /etc/security/limits.conf
* soft nofile 10000
* hard nofile 10000
```

### Error: Database pool exhausted

**Problema**: Todas las conexiones DB ocupadas.

**Solución**:
```typescript
// Incrementar pool size en typeorm.config.ts
extra: {
  max: 200,  // De 100 a 200
}
```

## Referencias

- [Artillery Docs](https://www.artillery.io/docs)
- [Performance Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [Load Testing vs Stress Testing](https://www.artillery.io/docs/guides/overview/why-artillery)

## Siguientes Pasos

1. **Establecer baseline**: Ejecutar load test y documentar métricas
2. **Monitoreo continuo**: Integrar Artillery en CI/CD
3. **APM**: Considerar New Relic, DataDog para profiling detallado
4. **Chaos engineering**: Implementar tests de resiliencia (latency injection, etc.)
