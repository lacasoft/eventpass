import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TicketScanService } from './ticket-scan.service';
import { TicketScanEventsService } from './ticket-scan-events.service';
import { IdempotencyService } from './idempotency.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ScanResponseDto } from './dto/scan-response.dto';
import { VenueOccupancyDto } from './dto/venue-occupancy.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { ScanStatus } from './enums/scan-status.enum';
import { TICKET_SCAN_THROTTLE_CONFIG } from '../../common/constants/throttle.constants';
import { ApiTicketScanRateLimit } from '../../common/decorators/api-rate-limit.decorator';

@ApiTags('ticket-scan')
@Controller('ticket-scan')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class TicketScanController {
  constructor(
    private readonly ticketScanService: TicketScanService,
    private readonly eventsService: TicketScanEventsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CHECKER)
  @Throttle(TICKET_SCAN_THROTTLE_CONFIG)
  @ApiTicketScanRateLimit()
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique identifier for this scan operation (minimum 16 characters). Prevents duplicate scans if the same key is used within 24 hours. Use a UUID v4 or similar unique string.',
    required: true,
    schema: {
      type: 'string',
      minLength: 16,
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
  })
  @ApiOperation({
    summary: 'Escanear un ticket (solo para CHECKERs)',
    description:
      'Permite a un CHECKER escanear un ticket y validar su estado. Registra la asistencia y actualiza el estado del ticket. Rate limited to 10 requests per minute per IP to prevent accidental double scanning. Requires Idempotency-Key header to prevent duplicate operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket escaneado exitosamente',
    type: ScanResponseDto,
    schema: {
      example: {
        status: 'VALID',
        message: 'Entrada permitida. ¡Bienvenido!',
        ticket: {
          id: 'uuid',
          ticketCode: 'TKT-ABC123-XYZ789',
          status: 'USED',
          eventId: 'uuid',
          usedAt: '2025-10-31T13:00:00.000Z',
        },
        booking: {
          id: 'uuid',
          quantity: 2,
          status: 'CONFIRMED',
          total: 100.0,
        },
        attendanceRecord: {
          id: 'uuid',
          ticketId: 'uuid',
          eventId: 'uuid',
          venueId: 'uuid',
          checkerId: 'uuid',
          scanStatus: 'VALID',
          scannedAt: '2025-10-31T13:00:00.000Z',
        },
        scannedAt: '2025-10-31T13:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket rechazado (varios estados posibles)',
    schema: {
      examples: {
        alreadyUsed: {
          summary: 'Ticket ya usado',
          value: {
            status: 'ALREADY_USED',
            message: 'Ticket ya utilizado el 31/10/2025 12:30:00',
            ticket: { id: 'uuid', ticketCode: 'TKT-ABC123' },
            scannedAt: '2025-10-31T13:00:00.000Z',
          },
        },
        invalid: {
          summary: 'Ticket inválido',
          value: {
            status: 'INVALID',
            message: 'Ticket no encontrado o código inválido',
            scannedAt: '2025-10-31T13:00:00.000Z',
          },
        },
        notAssigned: {
          summary: 'Checker no asignado',
          value: {
            status: 'NOT_ASSIGNED',
            message: 'No tienes permiso para escanear tickets de este evento',
            scannedAt: '2025-10-31T13:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Idempotency-Key header inválido o faltante',
    schema: {
      example: {
        statusCode: 400,
        message: 'Idempotency-Key header is required for scan operations',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes de escaneo',
    schema: {
      example: {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
        error: 'Too Many Requests',
      },
    },
  })
  async scanTicket(
    @Body() scanDto: ScanTicketDto,
    @Request() req,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ScanResponseDto> {
    const checkerId = req.user.sub;

    // Validar idempotency key (lanzará excepción si es undefined o inválido)
    this.idempotencyService.validateIdempotencyKey(idempotencyKey);

    // Después de la validación, TypeScript necesita saber que ya no es undefined
    const validatedKey = idempotencyKey as string;

    // Buscar respuesta cacheada
    const cachedResponse = await this.idempotencyService.getCachedResponse(
      checkerId,
      validatedKey,
    );

    if (cachedResponse) {
      // Retornar la respuesta anterior si existe (operación idempotente)
      return cachedResponse;
    }

    // Procesar el escaneo normalmente
    const response = await this.ticketScanService.scanTicket(scanDto, checkerId);

    // Cachear la respuesta para futuras peticiones con la misma idempotency key
    await this.idempotencyService.cacheResponse(
      checkerId,
      validatedKey,
      response,
    );

    return response;
  }

  @Get('venue-occupancy/:eventId/:venueId')
  @Roles(UserRole.CHECKER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Obtener ocupación de un recinto',
    description:
      'Obtiene estadísticas de capacidad y ocupación de un recinto para un evento específico.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'ID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'venueId',
    description: 'ID del recinto',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de ocupación del recinto',
    type: VenueOccupancyDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Evento o recinto no encontrado',
  })
  async getVenueOccupancy(
    @Param('eventId') eventId: string,
    @Param('venueId') venueId: string,
  ): Promise<VenueOccupancyDto> {
    return this.ticketScanService.getVenueOccupancy(eventId, venueId);
  }

  @Get('my-scan-history')
  @Roles(UserRole.CHECKER)
  @ApiOperation({
    summary: 'Ver mi historial de escaneos',
    description:
      'Permite a un CHECKER ver su historial de escaneos. Opcionalmente puede filtrar por evento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de escaneos del checker',
  })
  async getMyScanHistory(@Request() req, @Query('eventId') eventId?: string) {
    const checkerId = req.user.sub;
    return this.ticketScanService.getCheckerScanHistory(checkerId, eventId);
  }

  @Get('event-stats/:eventId')
  @Roles(UserRole.CHECKER)
  @ApiOperation({
    summary: 'Ver mis estadísticas de un evento',
    description:
      'Obtiene estadísticas de escaneos realizados por el CHECKER en un evento específico.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'ID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del checker para el evento',
    schema: {
      example: {
        eventId: 'uuid',
        checkerId: 'uuid',
        totalScans: 150,
        validScans: 142,
        rejectedScans: 8,
        successRate: 94.67,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a este evento',
  })
  async getEventStats(@Param('eventId') eventId: string, @Request() req) {
    const checkerId = req.user.sub;
    return this.ticketScanService.getEventStats(eventId, checkerId);
  }

  @Sse('occupancy-updates/:eventId')
  @Roles(UserRole.CHECKER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiExcludeEndpoint()
  occupancyUpdates(
    @Param('eventId') eventId: string,
  ): Observable<MessageEvent> {
    return this.eventsService.getOccupancyUpdates(eventId).pipe(
      map((data) => ({
        data,
      })),
    );
  }
}
