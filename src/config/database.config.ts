import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { registerAs } from '@nestjs/config';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const dbSsl = process.env.DB_SSL === 'true';

  const config: TypeOrmModuleOptions = {
    type: (process.env.DB_TYPE as any) || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nestjs_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsRun: true,
  };

  // CRÍTICO: Solo agregar la propiedad ssl si DB_SSL=true
  // El driver pg interpreta la presencia de ssl (incluso como false) como intento de SSL
  if (dbSsl) {
    (config as any).ssl = { rejectUnauthorized: false };
  }

  return config;
});
