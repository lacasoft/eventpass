import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Listar todos los usuarios',
    description:
      'Permite a admin y super_admin listar usuarios con paginación y filtros. ' +
      'Soporta filtrado por rol, status y búsqueda por email/nombre.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'organizer@example.com',
            firstName: 'Juan',
            lastName: 'Pérez',
            phone: '+56912345678',
            role: 'organizer',
            isActive: true,
            mustChangePassword: false,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        ],
        meta: {
          page: 1,
          limit: 50,
          total: 100,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de admin o super_admin',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'customer' does not have permission to access this resource. Required roles: admin, super-admin",
        error: 'Forbidden',
      },
    },
  })
  async findAll(@Query() queryUsersDto: QueryUsersDto) {
    const result = await this.usersService.findAllWithFilters(queryUsersDto);

    // Excluir passwords de todos los usuarios
    const usersWithoutPasswords = result.data.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: usersWithoutPasswords,
      meta: result.meta,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Crear usuario (organizador, checker o admin)',
    description:
      'Permite a super_admin crear usuarios con roles de organizador, checker o admin. ' +
      'Los admin solo pueden crear usuarios con rol checker. ' +
      'Se genera una contraseña temporal que debe ser cambiada en el primer inicio de sesión.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    schema: {
      example: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'organizer@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '+56912345678',
          role: 'organizer',
          temporaryPassword: 'Xk9mP2nQ7wR5tY8u',
          mustChangePassword: true,
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o intento de crear super_admin',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot create users with super_admin role',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos suficientes o intenta crear un rol no permitido',
    schema: {
      example: {
        statusCode: 403,
        message: 'Admin users can only create checker users',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya existe',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already exists',
        error: 'Conflict',
      },
    },
  })
  async createUserByAdmin(
    @Body() createUserByAdminDto: CreateUserByAdminDto,
    @CurrentUser('role') currentUserRole: UserRole,
  ) {
    const { user, temporaryPassword } =
      await this.usersService.createUserByAdmin(createUserByAdminDto, currentUserRole);

    // Excluir el password hasheado de la respuesta
    const { password, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        temporaryPassword,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description:
      'Permite a admin y super_admin obtener los detalles de un usuario específico por su ID.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+56912345678',
        role: 'cliente',
        isActive: true,
        mustChangePassword: false,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'No tiene permisos de admin o super_admin' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Actualizar usuario',
    description:
      'Permite a admin y super_admin actualizar un usuario. ' +
      'Solo super_admin puede actualizar otros admins o modificar roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'updated@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        role: 'organizador',
        isActive: true,
        updatedAt: '2024-01-15T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('role') currentUserRole: UserRole,
  ) {
    const user = await this.usersService.update(id, updateUserDto, currentUserRole);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Eliminar usuario (soft delete)',
    description:
      'Elimina un usuario mediante soft delete. El usuario queda marcado como eliminado pero no se borra físicamente. ' +
      'Solo super_admin puede eliminar admins.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes para eliminar este usuario' })
  async remove(@Param('id') id: string, @CurrentUser('role') currentUserRole: UserRole) {
    await this.usersService.remove(id, currentUserRole);
    return { message: 'User deleted successfully' };
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Activar usuario',
    description: 'Activa un usuario inactivo. Solo super_admin puede activar admins.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario activado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        isActive: true,
        updatedAt: '2024-01-15T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async activate(@Param('id') id: string, @CurrentUser('role') currentUserRole: UserRole) {
    const user = await this.usersService.activate(id, currentUserRole);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Desactivar usuario',
    description: 'Desactiva un usuario activo. Solo super_admin puede desactivar admins.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        isActive: false,
        updatedAt: '2024-01-15T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async deactivate(@Param('id') id: string, @CurrentUser('role') currentUserRole: UserRole) {
    const user = await this.usersService.deactivate(id, currentUserRole);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Restaurar usuario eliminado',
    description:
      'Restaura un usuario que fue eliminado mediante soft delete. ' +
      'Solo super_admin puede restaurar admins.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario restaurado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        deletedAt: null,
        updatedAt: '2024-01-15T15:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'El usuario no está eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async restore(@Param('id') id: string, @CurrentUser('role') currentUserRole: UserRole) {
    const user = await this.usersService.restore(id, currentUserRole);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
