import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createAdminUser } from './create-admin.seed';

// Cargar variables de entorno
config();

const AppDataSource = new DataSource({
  type: (process.env.DB_TYPE as any) || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestjs_db',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function runSeeds() {
  try {
    console.log('🌱 Iniciando seeders...');

    await AppDataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    await createAdminUser(AppDataSource);

    await AppDataSource.destroy();
    console.log('✅ Seeders completados');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  }
}

runSeeds();
