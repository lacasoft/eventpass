# EventPass - Test Suite

Este directorio contiene todos los tests del proyecto EventPass organizados por tipo y módulo.

## Estructura de Directorios

```
test/
├── e2e/                    # Tests end-to-end (E2E)
├── integration/            # Tests de integración
└── unit/                   # Tests unitarios
    ├── common/             # Tests de componentes comunes
    │   ├── guards/         # Tests de guards (autenticación, autorización)
    │   ├── middleware/     # Tests de middleware
    │   ├── pipes/          # Tests de pipes (validación, transformación)
    │   └── services/       # Tests de servicios comunes (email, cache, etc.)
    └── modules/            # Tests de módulos de negocio
        ├── auth/           # Tests del módulo de autenticación
        ├── health/         # Tests del módulo de health checks
        └── users/          # Tests del módulo de usuarios
```

## Tipos de Tests

### 1. **Unit Tests** (`test/unit/`)
Tests que verifican el comportamiento de componentes individuales de forma aislada.

**Características:**
- Rápidos de ejecutar
- Usan mocks para todas las dependencias
- Prueban una sola unidad de código (función, método, clase)
- No requieren base de datos ni servicios externos

**Ejecutar:**
```bash
npm run test:unit              # Ejecutar todos los tests unitarios
npm run test:unit:watch        # Modo watch
npm run test:unit:cov          # Con cobertura de código
```

### 2. **Integration Tests** (`test/integration/`)
Tests que verifican la interacción entre múltiples componentes.

**Características:**
- Prueban la integración entre servicios, repositorios y base de datos
- Pueden usar base de datos de prueba o mocks parciales
- Verifican flujos completos de datos

**Ejecutar:**
```bash
npm run test:integration      # Ejecutar tests de integración
npm run test:integration:cov  # Con cobertura
```

### 3. **E2E Tests** (`test/e2e/`)
Tests que verifican el sistema completo desde la perspectiva del usuario.

**Características:**
- Prueban endpoints HTTP completos
- Usan toda la aplicación (controllers, services, database)
- Verifican el comportamiento real del sistema

**Ejecutar:**
```bash
npm run test:e2e              # Ejecutar tests E2E
```

## Ejecutar Todos los Tests

```bash
npm run test:all              # Ejecuta unit + integration + e2e
npm run test:cov              # Ejecuta unit + integration con cobertura
npm test                      # Ejecuta solo tests unitarios (default)
```

## Configuración de Jest

Cada tipo de test tiene su propia configuración:

- **`jest-unit.json`**: Configuración para tests unitarios
- **`jest-integration.json`**: Configuración para tests de integración
- **`jest-e2e.json`**: Configuración para tests E2E

## Convenciones de Nombres

- Tests unitarios: `*.spec.ts`
- Tests E2E: `*.e2e-spec.ts`
- Archivos de test deben estar en el mismo nivel de carpetas que el código que prueban

**Ejemplo:**
```
src/modules/auth/auth.service.ts
test/unit/modules/auth/auth.service.spec.ts
```

## Estructura de un Test Unitario

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceToTest } from '../../../../src/modules/example/service-to-test';

describe('ServiceToTest', () => {
  let service: ServiceToTest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceToTest,
        // Mocks de dependencias
      ],
    }).compile();

    service = module.get<ServiceToTest>(ServiceToTest);
  });

  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should throw error when condition fails', () => {
      expect(() => service.methodName(null)).toThrow();
    });
  });
});
```

## Cobertura de Código

La cobertura de código se genera en el directorio `coverage/`:

- `coverage/unit/`: Cobertura de tests unitarios
- `coverage/integration/`: Cobertura de tests de integración

**Ver reporte:**
```bash
npm run test:unit:cov
# Abrir coverage/unit/lcov-report/index.html en el navegador
```

## Mocks y Utilities

Para mantener los tests limpios, considera crear archivos de mocks reutilizables:

```
test/
├── mocks/
│   ├── user.mock.ts
│   ├── auth.mock.ts
│   └── config.mock.ts
└── utils/
    ├── test-db.setup.ts
    └── test-helpers.ts
```

## Best Practices

1. **Un test debe probar una sola cosa**: Cada `it()` debe verificar un comportamiento específico
2. **Usar describe anidados**: Organizar tests por método/funcionalidad
3. **Nombres descriptivos**: `it('should throw UnauthorizedException when credentials are invalid')`
4. **AAA Pattern**: Arrange (preparar), Act (ejecutar), Assert (verificar)
5. **Limpiar después**: Usar `afterEach()` para limpiar mocks y estados
6. **Tests independientes**: Cada test debe poder ejecutarse solo
7. **Evitar lógica compleja**: Los tests deben ser simples y legibles

## Tests del Módulo Auth (Implementados)

✅ **AuthService** ([auth.service.spec.ts](unit/modules/auth/auth.service.spec.ts))
- 22 tests cubriendo register, login, refreshTokens, forgotPassword, resetPassword

✅ **AuthController** ([auth.controller.spec.ts](unit/modules/auth/auth.controller.spec.ts))
- 18 tests cubriendo todos los endpoints y manejo de errores

✅ **EmailService** ([email.service.spec.ts](unit/common/services/email.service.spec.ts))
- 18 tests cubriendo envío de emails y manejo de errores SMTP

**Total: 58 tests pasando ✓**

## Próximos Tests a Implementar

- [ ] UsersService (unit/modules/users/)
- [ ] UsersController (unit/modules/users/)
- [ ] Guards (unit/common/guards/)
  - [ ] JwtAuthGuard
  - [ ] RefreshJwtAuthGuard
  - [ ] RolesGuard
- [ ] Middleware (unit/common/middleware/)
  - [ ] ApiKeyMiddleware
  - [ ] SecurityHeadersMiddleware
- [ ] Pipes (unit/common/pipes/)
  - [ ] SanitizePipe
- [ ] Integration tests para flujos completos
- [ ] E2E tests para endpoints principales
