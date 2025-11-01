import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminAuthController {
  constructor(private authService: AuthService) {}

  @Post('invalidate-all-tokens')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Invalidar todos los tokens del sistema (Emergency logout)',
    description:
      'Invalida todos los tokens de acceso y refresh de todos los usuarios del sistema. ' +
      'Todos los usuarios deberán iniciar sesión nuevamente. ' +
      'Esta operación es solo para situaciones de emergencia o actualizaciones de seguridad críticas. ' +
      'Solo accesible para usuarios con rol SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos los tokens han sido invalidados exitosamente',
    schema: {
      example: {
        success: true,
        message:
          'Todos los tokens han sido invalidados. Los usuarios deberán iniciar sesión nuevamente.',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de SUPER_ADMIN',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'admin' does not have permission to access this resource. Required roles: super-admin",
        error: 'Forbidden',
      },
    },
  })
  async invalidateAllTokens() {
    return this.authService.invalidateAllTokens();
  }
}
