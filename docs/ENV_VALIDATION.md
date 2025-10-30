# Environment Variables Validation

Este módulo proporciona validación automática de variables de entorno durante el inicio de la aplicación.

## Características

- ✅ **Validación de tipos**: Convierte automáticamente strings a los tipos correctos (number, boolean, enum)
- ✅ **Validación de rangos**: Verifica que los valores numéricos estén dentro de rangos válidos
- ✅ **Validación de formatos**: Valida emails, URLs, y otros formatos específicos
- ✅ **Variables opcionales**: Permite que ciertas variables sean opcionales (como configuración de email)
- ✅ **Mensajes de error descriptivos**: Indica exactamente qué variable falla y por qué
- ✅ **Referencia al .env.example**: Los errores incluyen un mensaje para revisar el archivo de ejemplo

## Cómo funciona

La validación se ejecuta automáticamente al iniciar la aplicación gracias a la integración con `ConfigModule`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validate, // <-- Función de validación
})
```

Si alguna variable falla la validación, la aplicación **no iniciará** y mostrará un mensaje de error descriptivo.

## Variables validadas

### App
- `NODE_ENV`: Enum (development, production, test, staging)
- `APP_NAME`: String
- `PORT`: Number (1-65535)
- `API_KEY`: String
- `API_SECRET`: String
- `JWT_SECRET`: String
- `JWT_EXPIRES_IN`: String

### Database
- `DB_TYPE`: Enum (postgres, mysql, mariadb, sqlite, mssql, oracle, cockroachdb)
- `DB_HOST`: String
- `DB_PORT`: Number (1-65535)
- `DB_USERNAME`: String
- `DB_PASSWORD`: String
- `DB_NAME`: String
- `DB_SSL`: Boolean
- `DB_POOL_SIZE`: Number (min: 1)
- `DB_IDLE_TIMEOUT`: Number (min: 1000ms)
- `DB_CONNECTION_TIMEOUT`: Number (min: 1000ms)

### Security
- `ALLOWED_ORIGINS`: String
- `JWT_REFRESH_SECRET`: String
- `JWT_REFRESH_EXPIRES_IN`: String

### Performance & Cache
- `CACHE_TTL`: Number (min: 0)
- `CACHE_MAX_ITEMS`: Number (min: 1)
- `CLUSTER_WORKERS`: String
- `CACHE_ENABLED`: Boolean

### Redis
- `REDIS_HOST`: String
- `REDIS_PORT`: Number (1-65535)
- `REDIS_PASSWORD`: String (opcional)
- `REDIS_DB`: Number (0-15)

### Rate Limiting
- `THROTTLE_TTL`: Number (min: 1000ms)
- `THROTTLE_LIMIT`: Number (min: 1)
- `THROTTLE_LOGIN_LIMIT`: Number (min: 1)

### Super Admin
- `SUPER_ADMIN_EMAIL`: Email válido
- `SUPER_ADMIN_PASSWORD`: String
- `SUPER_ADMIN_FIRST_NAME`: String
- `SUPER_ADMIN_LAST_NAME`: String

### Email (Opcionales)
- `EMAIL_SMTP_HOST`: String (opcional)
- `EMAIL_SMTP_PORT`: Number 1-65535 (opcional)
- `EMAIL_SMTP_SECURE`: Boolean (opcional)
- `EMAIL_SMTP_USER`: Email válido (opcional)
- `EMAIL_SMTP_PASS`: String (opcional)
- `EMAIL_FROM_NAME`: String (opcional)
- `EMAIL_FROM_ADDRESS`: Email válido (opcional)

### Frontend
- `FRONTEND_URL`: URL válida

### Swagger
- `SWAGGER_TITLE`: String
- `SWAGGER_DESCRIPTION`: String
- `SWAGGER_VERSION`: String

### Stripe
- `STRIPE_SECRET_KEY`: String
- `STRIPE_PUBLISHABLE_KEY`: String
- `STRIPE_WEBHOOK_SECRET`: String
- `STRIPE_CURRENCY`: Enum (usd, eur, gbp, mxn, ars, clp, cop, pen)

## Ejemplos de errores

### Variable faltante
```
❌ Environment variables validation failed:

  - JWT_SECRET: isString

Please check your .env file and ensure all required variables are properly set.
Refer to .env.example for reference.
```

### Tipo incorrecto
```
❌ Environment variables validation failed:

  - PORT: max must not be greater than 65535

Please check your .env file and ensure all required variables are properly set.
Refer to .env.example for reference.
```

### Valor inválido
```
❌ Environment variables validation failed:

  - NODE_ENV: NODE_ENV must be one of the following values: development, production, test, staging

Please check your .env file and ensure all required variables are properly set.
Refer to .env.example for reference.
```

## Agregar nuevas variables

Para agregar una nueva variable de entorno:

1. Agrega la variable a `.env.example`
2. Agrega la propiedad y decoradores en `src/config/env.validation.ts`:

```typescript
export class EnvironmentVariables {
  // ... otras variables

  @IsString()
  @IsOptional() // Si es opcional
  MI_NUEVA_VARIABLE?: string;
}
```

3. Usa los decoradores de `class-validator`:
   - `@IsString()`: Valida string
   - `@IsInt()`, `@Min()`, `@Max()`: Valida números con rangos
   - `@IsBoolean()`: Valida booleanos
   - `@IsEnum(MiEnum)`: Valida contra un enum
   - `@IsEmail()`: Valida formato de email
   - `@IsUrl()`: Valida formato de URL
   - `@IsOptional()`: Marca como opcional
   - `@Type(() => Number)`: Convierte string a número
   - `@Type(() => Boolean)`: Convierte string a boolean

4. Actualiza los tests en `test/unit/config/env.validation.spec.ts`

## Tests

Ejecuta los tests del validador con:

```bash
npm run test:unit -- env.validation.spec
```

El validador tiene 17 tests que cubren:
- ✅ Validación de tipos correctos
- ✅ Transformación de tipos (string → number, boolean)
- ✅ Validación de enums
- ✅ Validación de rangos
- ✅ Validación de formatos (email, URL)
- ✅ Variables opcionales
- ✅ Mensajes de error descriptivos
- ✅ Todos los valores posibles de enums

## Referencias

- [class-validator](https://github.com/typestack/class-validator) - Decoradores de validación
- [class-transformer](https://github.com/typestack/class-transformer) - Transformación de tipos
- [NestJS ConfigModule](https://docs.nestjs.com/techniques/configuration#custom-validate-function) - Integración con NestJS
