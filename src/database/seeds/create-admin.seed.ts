import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export async function createAdminUser(dataSource: DataSource) {
  const userRepository = dataSource.getRepository('User');

  // Obtener credenciales del super-admin desde variables de entorno
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@eventpass.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!@#';
  const superAdminFirstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const superAdminLastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

  // Verificar si ya existe un super-admin
  const existingSuperAdmin = await userRepository.findOne({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log('✅ Usuario super-admin ya existe');
    return;
  }

  // Crear usuario super-admin
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = userRepository.create({
    email: superAdminEmail,
    password: hashedPassword,
    firstName: superAdminFirstName,
    lastName: superAdminLastName,
    role: UserRole.SUPER_ADMIN,
    isActive: true,
  });

  await userRepository.save(superAdmin);

  console.log('✅ Usuario super-admin creado exitosamente:');
  console.log(`   Email: ${superAdminEmail}`);
  console.log(`   Password: ${superAdminPassword}`);
  console.log(`   Role: ${UserRole.SUPER_ADMIN}`);
  console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
}
