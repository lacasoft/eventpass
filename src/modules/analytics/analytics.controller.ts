import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { OrganizerDashboardDto } from './dto/organizer-dashboard.dto';
import { EventStatsDto } from './dto/event-stats.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('organizer/dashboard')
  @Roles(UserRole.ORGANIZER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Dashboard del organizador',
    description:
      'Obtiene estadísticas y resumen de todos los eventos del organizador actual. ' +
      'Solo muestra eventos del organizador autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard obtenido exitosamente',
    type: OrganizerDashboardDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No tiene rol de organizador',
  })
  async getOrganizerDashboard(@CurrentUser('userId') userId: string): Promise<OrganizerDashboardDto> {
    return this.analyticsService.getOrganizerDashboard(userId);
  }

  @Get('events/:id/stats')
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Estadísticas de un evento específico',
    description:
      'Obtiene estadísticas detalladas de un evento incluyendo ventas, revenue, y ocupación. ' +
      'Solo el owner del evento, admin o super_admin pueden acceder.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    type: EventStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No es el owner del evento',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async getEventStats(
    @Param('id') eventId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<EventStatsDto> {
    return this.analyticsService.getEventStats(eventId, userId, userRole);
  }

  @Get('admin/dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Dashboard de administrador',
    description:
      'Obtiene estadísticas globales de la plataforma incluyendo usuarios, eventos, ' +
      'revenue total, top eventos y organizadores. Solo para admin y super_admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard obtenido exitosamente',
    type: AdminDashboardDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No tiene rol de admin',
  })
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    return this.analyticsService.getAdminDashboard();
  }
}
