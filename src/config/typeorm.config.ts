import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// Configuración SSL para migraciones
const isProduction = process.env.NODE_ENV === 'production';
let dbSsl = process.env.DB_SSL === 'true';

// Override para desarrollo: forzar SSL a false para bases de datos locales
if (!isProduction && dbSsl) {
  console.warn(
    '[TypeORM Migrations] DB_SSL=true detected in development. ' +
      'Overriding to false for local database.',
  );
  dbSsl = false;
}

const dataSourceConfig: any = {
  type: (process.env.DB_TYPE as any) || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestjs_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Importante: debe ser false cuando usas migraciones
  logging: process.env.NODE_ENV !== 'production',
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  migrationsRun: true,
};

// Solo agregar ssl si está habilitado
if (dbSsl) {
  dataSourceConfig.ssl = { rejectUnauthorized: false };
}

export default new DataSource(dataSourceConfig);
