import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Event } from './entities/event.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @Roles(UserRole.ORGANIZER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo evento' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: 201,
    description: 'Evento creado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        venueId: '660e8400-e29b-41d4-a716-446655440001',
        title: 'Concierto Rock en Vivo 2025',
        description: 'Un increíble concierto de rock con las mejores bandas nacionales...',
        category: 'concert',
        eventDate: '2025-12-31T20:00:00.000Z',
        imageUrl: 'https://example.com/images/event-banner.jpg',
        ticketPrice: 25000,
        totalTickets: 1000,
        soldTickets: 0,
        isActive: true,
        isCancelled: false,
        organizerId: '770e8400-e29b-41d4-a716-446655440002',
        createdAt: '2025-01-28T10:30:00.000Z',
        updatedAt: '2025-01-28T10:30:00.000Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida o fecha en el pasado o totalTickets excede capacidad',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'El título debe tener al menos 5 caracteres',
          'La fecha del evento debe ser en el futuro',
          'La cantidad de boletos (1500) excede la capacidad del recinto (1000)',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Recinto no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Recinto no encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Requiere rol organizer o super_admin',
    schema: {
      example: {
        statusCode: 403,
        message:
          "User role 'customer' does not have permission to access this resource. Required roles: organizer, super_admin",
        error: 'Forbidden',
      },
    },
  })
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('userId') userId: string,
  ): Promise<Event> {
    const event = await this.eventsService.create(createEventDto, userId);

    // Invalidar caché después de crear
    await this.invalidateCache();

    return event;
  }

  @Get()
  @Public()
  @UseInterceptors(CacheInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar todos los eventos activos (público)',
    description:
      'Lista eventos activos y no cancelados con paginación y filtros. Endpoint público, no requiere autenticación.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['concert', 'sports', 'other'],
    example: 'concert',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Rock',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    example: 'Santiago',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'eventDate',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos activos',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Concierto Rock en Vivo 2025',
            description: 'Un increíble concierto de rock...',
            category: 'concert',
            eventDate: '2025-12-31T20:00:00.000Z',
            imageUrl: 'https://example.com/images/event-banner.jpg',
            ticketPrice: 25000,
            totalTickets: 1000,
            soldTickets: 150,
            isActive: true,
            isCancelled: false,
            venue: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              name: 'Teatro Municipal',
              city: 'Santiago',
              capacity: 1000,
            },
            organizer: {
              id: '770e8400-e29b-41d4-a716-446655440002',
              email: 'organizer@example.com',
              firstName: 'Juan',
              lastName: 'Pérez',
            },
            createdAt: '2025-01-28T10:30:00.000Z',
            updatedAt: '2025-01-28T10:30:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 50,
          total: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  })
  async findAll(@Query() queryEventsDto: QueryEventsDto): Promise<PaginatedResult<Event>> {
    return this.eventsService.findAllWithFilters(queryEventsDto);
  }

  @Get('my-events')
  @Roles(UserRole.ORGANIZER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar mis eventos (organizador)',
    description: 'Lista todos los eventos del organizador autenticado con paginación y filtros.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['concert', 'sports', 'other'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos del organizador',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado - Requiere rol organizer o super_admin',
  })
  async findMyEvents(
    @CurrentUser('userId') userId: string,
    @Query() queryEventsDto: QueryEventsDto,
  ): Promise<PaginatedResult<Event>> {
    return this.eventsService.findMyEvents(userId, queryEventsDto);
  }

  @Get(':id')
  @Public()
  @UseInterceptors(CacheInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalle de un evento por ID (público)',
    description:
      'Obtiene la información completa de un evento incluyendo recinto y organizador. Endpoint público.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Evento encontrado',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Concierto Rock en Vivo 2025',
        description: 'Un increíble concierto de rock...',
        category: 'concert',
        eventDate: '2025-12-31T20:00:00.000Z',
        imageUrl: 'https://example.com/images/event-banner.jpg',
        ticketPrice: 25000,
        totalTickets: 1000,
        soldTickets: 150,
        isActive: true,
        isCancelled: false,
        venue: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Teatro Municipal',
          address: 'Calle Principal 123',
          city: 'Santiago',
          country: 'CL',
          capacity: 1000,
        },
        organizer: {
          id: '770e8400-e29b-41d4-a716-446655440002',
          email: 'organizer@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          role: 'organizer',
        },
        createdAt: '2025-01-28T10:30:00.000Z',
        updatedAt: '2025-01-28T10:30:00.000Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Evento no encontrado',
        error: 'Not Found',
      },
    },
  })
  async findOne(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ORGANIZER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un evento',
    description:
      'Permite al organizador propietario o super_admin actualizar los datos de un evento. No se puede actualizar eventos finalizados o cancelados.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Evento actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida o evento ya finalizado/cancelado',
    schema: {
      example: {
        statusCode: 400,
        message: 'No se puede actualizar un evento que ya finalizó',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para actualizar este evento',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permiso para actualizar este evento',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<Event> {
    const event = await this.eventsService.update(id, updateEventDto, userId, userRole);

    // Invalidar caché después de actualizar
    await this.invalidateCache();

    return event;
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ORGANIZER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar un evento',
    description:
      'Permite al organizador propietario o super_admin cancelar un evento. No se puede cancelar eventos finalizados o ya cancelados.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Evento cancelado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Concierto Rock en Vivo 2025',
        isCancelled: true,
        isActive: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Evento ya finalizado o ya cancelado',
    schema: {
      example: {
        statusCode: 400,
        message: 'El evento ya está cancelado',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para cancelar este evento',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<Event> {
    const event = await this.eventsService.cancel(id, userId, userRole);

    // Invalidar caché después de cancelar
    await this.invalidateCache();

    return event;
  }

  /**
   * Invalidar caché del módulo events
   * TODO: Implementar invalidación granular cuando se use Redis con el store adecuado
   * Por ahora, la caché expira automáticamente después del TTL configurado (5 minutos)
   */
  private async invalidateCache(): Promise<void> {
    // La invalidación manual requiere acceso al store de Redis
    // Por ahora confiamos en el TTL automático
    // Cuando se implemente Redis: await this.cacheManager.store.reset('events:*');
  }
}
