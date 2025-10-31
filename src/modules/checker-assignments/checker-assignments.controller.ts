import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CheckerAssignmentsService } from './checker-assignments.service';
import { CreateCheckerAssignmentDto } from './dto/create-checker-assignment.dto';
import { UpdateCheckerAssignmentDto } from './dto/update-checker-assignment.dto';
import { QueryCheckerAssignmentDto } from './dto/query-checker-assignment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('checker-assignments')
@Controller('checker-assignments')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class CheckerAssignmentsController {
  constructor(
    private readonly assignmentsService: CheckerAssignmentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Asignar recintos y eventos a un CHECKER',
    description:
      'Permite a ADMIN y SUPER_ADMIN asignar uno o más recintos y eventos activos a un usuario con rol CHECKER. Se crearán todas las combinaciones posibles (producto cartesiano).',
  })
  @ApiResponse({
    status: 201,
    description: 'Asignaciones creadas exitosamente',
    schema: {
      example: [
        {
          id: 'uuid',
          checkerId: 'uuid',
          venueId: 'uuid',
          eventId: 'uuid',
          assignedBy: 'uuid',
          isActive: true,
          createdAt: '2025-10-31T00:00:00.000Z',
          updatedAt: '2025-10-31T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o usuario no es CHECKER',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario, recinto o evento no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Una o más asignaciones ya existen',
  })
  async createAssignments(
    @Body() createDto: CreateCheckerAssignmentDto,
    @Request() req,
  ) {
    const assignedByUserId = req.user.sub;
    return this.assignmentsService.createAssignments(
      createDto,
      assignedByUserId,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Obtener todas las asignaciones con filtros opcionales',
    description:
      'Permite a ADMIN y SUPER_ADMIN consultar todas las asignaciones. Se pueden aplicar filtros por checkerId, venueId, eventId o estado activo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de asignaciones',
    schema: {
      example: [
        {
          id: 'uuid',
          checkerId: 'uuid',
          venueId: 'uuid',
          eventId: 'uuid',
          assignedBy: 'uuid',
          isActive: true,
          createdAt: '2025-10-31T00:00:00.000Z',
          updatedAt: '2025-10-31T00:00:00.000Z',
          checker: {
            id: 'uuid',
            email: 'checker@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'checker',
          },
          venue: {
            id: 'uuid',
            name: 'Venue Name',
            address: '123 Main St',
            city: 'City',
            country: 'US',
          },
          event: {
            id: 'uuid',
            title: 'Event Title',
            eventDate: '2025-12-31T00:00:00.000Z',
            isActive: true,
          },
        },
      ],
    },
  })
  async findAll(@Query() queryDto: QueryCheckerAssignmentDto) {
    return this.assignmentsService.findAll(queryDto);
  }

  @Get('checker/:checkerId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CHECKER)
  @ApiOperation({
    summary: 'Obtener asignaciones de un CHECKER específico',
    description:
      'Permite consultar todas las asignaciones activas de un CHECKER. Los CHECKERs solo pueden ver sus propias asignaciones.',
  })
  @ApiParam({
    name: 'checkerId',
    description: 'ID del CHECKER',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de asignaciones del CHECKER',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async findByChecker(@Param('checkerId') checkerId: string, @Request() req) {
    // Si el usuario es CHECKER, solo puede ver sus propias asignaciones
    if (req.user.role === UserRole.CHECKER && req.user.sub !== checkerId) {
      // Retornar array vacío si intenta ver asignaciones de otro checker
      return [];
    }

    return this.assignmentsService.findByChecker(checkerId);
  }

  @Get('my-assignments')
  @Roles(UserRole.CHECKER)
  @ApiOperation({
    summary: 'Obtener mis asignaciones (endpoint para CHECKERs)',
    description:
      'Permite a un CHECKER consultar sus propias asignaciones activas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de asignaciones del CHECKER autenticado',
  })
  async getMyAssignments(@Request() req) {
    const checkerId = req.user.sub;
    return this.assignmentsService.findByChecker(checkerId);
  }

  @Get('my-assignments-details')
  @Roles(UserRole.CHECKER)
  @ApiOperation({
    summary: 'Obtener mis asignaciones con detalles completos',
    description:
      'Permite a un CHECKER consultar sus asignaciones con detalles completos de eventos y recintos, incluyendo capacidades y características.',
  })
  @ApiResponse({
    status: 200,
    description: 'Asignaciones detalladas del CHECKER autenticado',
    schema: {
      example: {
        checkerId: 'uuid',
        checkerName: 'Juan Pérez',
        checkerEmail: 'juan@example.com',
        totalAssignments: 4,
        assignments: [
          {
            event: {
              id: 'uuid',
              title: 'Concierto de Rock 2025',
              description: 'Gran concierto de rock',
              category: 'MUSIC',
              eventDate: '2025-12-31T20:00:00.000Z',
              ticketPrice: 50.0,
              totalTickets: 10000,
              soldTickets: 7500,
              availableTickets: 2500,
              isActive: true,
              isCancelled: false,
              imageUrl: 'https://example.com/image.jpg',
            },
            venues: [
              {
                id: 'uuid',
                name: 'Estadio Nacional',
                address: 'Av. Principal 123',
                city: 'Santiago',
                country: 'CL',
                capacity: 50000,
                assignmentId: 'uuid',
                assignedAt: '2025-10-31T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    },
  })
  async getMyAssignmentsWithDetails(@Request() req) {
    const checkerId = req.user.sub;
    return this.assignmentsService.getCheckerAssignmentsWithDetails(checkerId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Obtener una asignación por ID',
    description: 'Permite a ADMIN y SUPER_ADMIN consultar una asignación específica.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la asignación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Asignación encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Asignación no encontrada',
  })
  async findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Put(':checkerId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Actualizar asignaciones de un CHECKER',
    description:
      'Permite a ADMIN y SUPER_ADMIN actualizar las asignaciones de un CHECKER. Desactiva las asignaciones actuales y crea nuevas según los datos proporcionados.',
  })
  @ApiParam({
    name: 'checkerId',
    description: 'ID del CHECKER',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Asignaciones actualizadas exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o usuario no es CHECKER',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario, recinto o evento no encontrado',
  })
  async updateAssignments(
    @Param('checkerId') checkerId: string,
    @Body() updateDto: UpdateCheckerAssignmentDto,
    @Request() req,
  ) {
    const assignedByUserId = req.user.sub;
    return this.assignmentsService.updateAssignments(
      checkerId,
      updateDto,
      assignedByUserId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Eliminar una asignación específica',
    description:
      'Permite a ADMIN y SUPER_ADMIN desactivar una asignación específica (soft delete).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la asignación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Asignación eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Asignación no encontrada',
  })
  async removeAssignment(@Param('id') id: string) {
    await this.assignmentsService.removeAssignment(id);
  }

  @Delete('checker/:checkerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Eliminar todas las asignaciones de un CHECKER',
    description:
      'Permite a ADMIN y SUPER_ADMIN desactivar todas las asignaciones de un CHECKER específico.',
  })
  @ApiParam({
    name: 'checkerId',
    description: 'ID del CHECKER',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Todas las asignaciones del CHECKER fueron eliminadas',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async removeAllAssignments(@Param('checkerId') checkerId: string) {
    await this.assignmentsService.removeAllAssignmentsForChecker(checkerId);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Reactivar una asignación específica',
    description:
      'Permite a ADMIN y SUPER_ADMIN reactivar una asignación que había sido desactivada.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la asignación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Asignación reactivada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Asignación no encontrada',
  })
  async activateAssignment(@Param('id') id: string) {
    return this.assignmentsService.activateAssignment(id);
  }
}
