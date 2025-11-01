import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { PasswordUtil } from '../../common/utils/password.util';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Like, IsNull } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto, currentUserRole?: UserRole): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validar que solo admin y super-admin pueden asignar roles diferentes a CLIENTE
    if (createUserDto.role && createUserDto.role !== UserRole.CUSTOMER) {
      if (
        !currentUserRole ||
        (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN)
      ) {
        throw new ForbiddenException(
          'Only administrators can create users with roles other than CLIENTE',
        );
      }

      // Solo super-admin puede crear otros admins
      if (createUserDto.role === UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only super-admin can create admin users');
      }

      // Nadie puede crear super-admins (solo por seeder)
      if (createUserDto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Super-admin users cannot be created through API');
      }
    }

    const hashedPassword = await PasswordUtil.hashPassword(createUserDto.password);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || UserRole.CUSTOMER,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Buscar usuarios con filtros y paginación
   * @param queryUsersDto - Parámetros de búsqueda, filtros y paginación
   * @returns Resultado paginado con usuarios
   */
  async findAllWithFilters(queryUsersDto: QueryUsersDto): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 50,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryUsersDto;

    // Construir condiciones de búsqueda
    const where: any = {};

    // Filtro por rol (el Transform en el DTO ya lo convirtió al enum)
    if (role) {
      where.role = role;
    }

    // Filtro por status (mapear a isActive y deletedAt)
    if (status) {
      if (status === UserStatus.ACTIVE) {
        where.isActive = true;
        where.deletedAt = IsNull();
      } else if (status === UserStatus.INACTIVE) {
        where.isActive = false;
        where.deletedAt = IsNull();
      } else if (status === UserStatus.SUSPENDED) {
        // Suspended usuarios son los que tienen deletedAt (soft deleted)
        // Necesitamos usar withDeleted para incluirlos
      }
    } else {
      // Por defecto, excluir usuarios eliminados
      where.deletedAt = IsNull();
    }

    // Búsqueda por email, firstName o lastName
    let users: User[];
    let total: number;

    if (search) {
      const searchLower = search.toLowerCase();

      // Obtener todos los usuarios que coincidan con los filtros básicos
      const allUsers = await this.userRepository.find({
        where: status === UserStatus.SUSPENDED ? undefined : where,
        withDeleted: status === UserStatus.SUSPENDED,
        order: {
          [sortBy]: sortOrder,
        },
      });

      // Filtrar manualmente por búsqueda (case-insensitive)
      users = allUsers.filter((user) => {
        const emailMatch = user.email?.toLowerCase().includes(searchLower);
        const firstNameMatch = user.firstName?.toLowerCase().includes(searchLower);
        const lastNameMatch = user.lastName?.toLowerCase().includes(searchLower);

        return emailMatch || firstNameMatch || lastNameMatch;
      });

      // Si hay status suspended, filtrar solo los que tienen deletedAt
      if (status === UserStatus.SUSPENDED) {
        users = users.filter((user) => user.deletedAt !== null);
      }

      total = users.length;

      // Aplicar paginación manualmente
      const skip = (page - 1) * limit;
      users = users.slice(skip, skip + limit);
    } else {
      // Sin búsqueda de texto, usar consulta normal con paginación
      const skip = (page - 1) * limit;

      [users, total] = await this.userRepository.findAndCount({
        where: status === UserStatus.SUSPENDED ? undefined : where,
        withDeleted: status === UserStatus.SUSPENDED,
        skip,
        take: limit,
        order: {
          [sortBy]: sortOrder,
        },
      });

      // Si hay status suspended, filtrar solo los que tienen deletedAt
      if (status === UserStatus.SUSPENDED) {
        users = users.filter((user) => user.deletedAt !== null);
        total = users.length;
      }
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserRole?: UserRole,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Validar cambios de rol
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      // Solo admin y super-admin pueden cambiar roles
      if (
        !currentUserRole ||
        (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN)
      ) {
        throw new ForbiddenException('Only administrators can change user roles');
      }

      // Solo super-admin puede cambiar roles de admin
      if (
        (user.role === UserRole.ADMIN || updateUserDto.role === UserRole.ADMIN) &&
        currentUserRole !== UserRole.SUPER_ADMIN
      ) {
        throw new ForbiddenException('Only super-admin can modify admin roles');
      }

      // Nadie puede modificar super-admin
      if (user.role === UserRole.SUPER_ADMIN || updateUserDto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Super-admin role cannot be modified');
      }
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateUserDto.password) {
      updateUserDto.password = await PasswordUtil.hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string, currentUserRole?: UserRole): Promise<void> {
    const user = await this.findOne(id);

    // Validar que no se pueda eliminar super-admin
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super-admin user cannot be deleted');
    }

    // Solo admin y super-admin pueden eliminar usuarios
    if (
      !currentUserRole ||
      (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    // Solo super-admin puede eliminar admins
    if (user.role === UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super-admin can delete admin users');
    }

    // Soft delete en lugar de eliminación física
    await this.userRepository.softDeleteUser(user);
  }

  async restore(id: string, currentUserRole?: UserRole): Promise<User> {
    // Solo admin y super-admin pueden restaurar usuarios
    if (
      !currentUserRole ||
      (currentUserRole !== UserRole.ADMIN && currentUserRole !== UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Only administrators can restore users');
    }

    // Buscar usuario eliminado
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    // Restaurar usuario
    await this.userRepository.restoreUser(id);

    return this.findOne(id);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({ where: { role } });
  }

  async deactivate(id: string, currentUserRole?: UserRole): Promise<User> {
    return this.update(id, { isActive: false }, currentUserRole);
  }

  async activate(id: string, currentUserRole?: UserRole): Promise<User> {
    return this.update(id, { isActive: true }, currentUserRole);
  }

  /**
   * Actualizar contraseña del usuario (usado en password reset)
   * @param id ID del usuario
   * @param hashedPassword Contraseña ya hasheada
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const user = await this.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Actualizar solo la contraseña
    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * Actualizar perfil del usuario (sin cambiar role, password, isActive)
   * Usado para que usuarios actualicen su propio perfil
   */
  async updateProfile(
    id: string,
    updateData: { firstName?: string; lastName?: string; phone?: string; email?: string },
  ): Promise<User> {
    const user = await this.findOne(id);

    // Verificar si el nuevo email ya está en uso (si se está cambiando)
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(updateData.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Actualizar solo los campos permitidos
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.email !== undefined) user.email = updateData.email;

    return this.userRepository.save(user);
  }

  /**
   * Cambiar contraseña del usuario (requiere contraseña actual)
   * Usado para que usuarios cambien su propia contraseña
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verificar que la contraseña actual sea correcta
    const isPasswordValid = await PasswordUtil.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hashear la nueva contraseña
    const hashedPassword = await PasswordUtil.hashPassword(newPassword);

    // Actualizar la contraseña y marcar que ya no necesita cambiar contraseña
    await this.userRepository.update(userId, {
      password: hashedPassword,
      mustChangePassword: false,
    });
  }

  /**
   * Crea un usuario con rol organizador, checker o admin
   * @param createUserByAdminDto - Datos del usuario a crear
   * @param currentUserRole - Rol del usuario que está creando
   * @returns Usuario creado con contraseña temporal
   */
  async createUserByAdmin(
    createUserByAdminDto: CreateUserByAdminDto,
    currentUserRole: UserRole,
  ): Promise<{ user: User; temporaryPassword: string }> {
    // Verificar que el email no esté en uso
    const existingUser = await this.userRepository.findByEmail(createUserByAdminDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validar permisos según el rol del usuario actual
    // ADMIN solo puede crear CHECKER
    if (currentUserRole === UserRole.ADMIN && createUserByAdminDto.role !== UserRole.CHECKER) {
      throw new ForbiddenException('Admin users can only create checker users');
    }

    // SUPER_ADMIN puede crear ORGANIZADOR, CHECKER y ADMIN (el DTO ya valida que no sea SUPER_ADMIN)

    // Generar contraseña temporal
    const temporaryPassword = PasswordUtil.generateTemporaryPassword();
    const hashedPassword = await PasswordUtil.hashPassword(temporaryPassword);

    // Crear el usuario (el Transform en el DTO ya convirtió el rol al enum)
    const user = this.userRepository.create({
      email: createUserByAdminDto.email,
      firstName: createUserByAdminDto.firstName,
      lastName: createUserByAdminDto.lastName,
      phone: createUserByAdminDto.phone,
      role: createUserByAdminDto.role,
      password: hashedPassword,
      mustChangePassword: true,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      user: savedUser,
      temporaryPassword,
    };
  }
}
