import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MyBookingsQueryDto } from './dto/my-bookings-query.dto';
import { BookingDetailResponseDto } from './dto/booking-detail-response.dto';
import { ConfirmBookingResponseDto } from './dto/confirm-booking-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Booking } from './entities/booking.entity';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('reserve')
  @Roles(UserRole.CLIENTE, UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear reserva temporal de boletos',
    description:
      'Crea una reserva temporal con lock distribuido en Redis para prevenir doble venta. La reserva expira en 10 minutos si no se completa el pago.',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Reserva creada exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '660e8400-e29b-41d4-a716-446655440001',
        userId: '770e8400-e29b-41d4-a716-446655440002',
        quantity: 2,
        unitPrice: 50.0,
        subtotal: 100.0,
        serviceFee: 15.0,
        total: 115.0,
        status: 'pending',
        expiresAt: '2025-01-28T18:40:00.000Z',
        event: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          title: 'Festival Rock 2025',
          eventDate: '2025-12-31T20:00:00.000Z',
          venue: {
            id: '880e8400-e29b-41d4-a716-446655440003',
            name: 'Auditorio Nacional',
            city: 'Ciudad de México',
          },
        },
        createdAt: '2025-01-28T18:30:00.000Z',
        updatedAt: '2025-01-28T18:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cantidad inválida, no hay suficientes boletos, o evento no disponible',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'La cantidad mínima de boletos es 1',
          'La cantidad máxima de boletos es 10',
          'No hay suficientes boletos disponibles. Disponibles: 5, Solicitados: 10',
          'El evento no está disponible para reservas',
          'El evento ya finalizó',
        ],
        error: 'Bad Request',
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
  @ApiResponse({
    status: 409,
    description: 'Sistema ocupado - Lock no disponible',
    schema: {
      example: {
        statusCode: 409,
        message:
          'Sistema ocupado: no se pudo adquirir lock para booking:event:660e8400-e29b-41d4-a716-446655440001',
        error: 'Conflict',
      },
    },
  })
  async reserve(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser('userId') userId: string,
  ): Promise<Booking> {
    return this.bookingsService.reserve(createBookingDto, userId);
  }

  @Get(':id')
  @Roles(UserRole.CLIENTE, UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener detalle de una reserva',
    description:
      'Obtiene la información completa de una reserva por su ID. Solo el owner, admin o super_admin pueden acceder.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva encontrada',
    type: BookingDetailResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        event: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          title: 'Festival Rock 2025',
          eventDate: '2025-12-31T20:00:00.000Z',
          venue: {
            id: '770e8400-e29b-41d4-a716-446655440002',
            name: 'Auditorio Nacional',
            address: 'Paseo de la Reforma 50, Ciudad de México',
            city: 'Ciudad de México',
          },
        },
        quantity: 2,
        unitPrice: 50.0,
        subtotal: 100.0,
        serviceFee: 15.0,
        total: 115.0,
        status: 'confirmed',
        paymentStatus: 'succeeded',
        tickets: [
          {
            id: '880e8400-e29b-41d4-a716-446655440003',
            ticketCode: 'TKT-2025-A1B2C3',
            status: 'valid',
          },
          {
            id: '990e8400-e29b-41d4-a716-446655440004',
            ticketCode: 'TKT-2025-D4E5F6',
            status: 'valid',
          },
        ],
        createdAt: '2025-01-28T18:30:00.000Z',
        confirmedAt: '2025-01-28T18:35:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No es el owner de la reserva',
    schema: {
      example: {
        statusCode: 403,
        message: 'No tienes permiso para ver esta reserva',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva no encontrada',
    schema: {
      example: {
        statusCode: 404,
        message: 'Reserva no encontrada',
        error: 'Not Found',
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: string,
  ): Promise<BookingDetailResponseDto> {
    return this.bookingsService.findOne(id, userId, userRole);
  }

  @Get('my-bookings')
  @Roles(UserRole.CLIENTE, UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar mis reservas',
    description:
      'Lista todas las reservas del usuario autenticado con paginación y filtros opcionales.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas paginada',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            event: {
              id: '660e8400-e29b-41d4-a716-446655440001',
              title: 'Festival Rock 2025',
              eventDate: '2025-12-31T20:00:00.000Z',
              venue: {
                id: '770e8400-e29b-41d4-a716-446655440002',
                name: 'Auditorio Nacional',
                address: 'Paseo de la Reforma 50',
                city: 'Ciudad de México',
              },
            },
            quantity: 2,
            unitPrice: 50.0,
            subtotal: 100.0,
            serviceFee: 15.0,
            total: 115.0,
            status: 'confirmed',
            paymentStatus: 'succeeded',
            tickets: [
              {
                id: '880e8400-e29b-41d4-a716-446655440003',
                ticketCode: 'TKT-2025-A1B2C3',
                status: 'valid',
              },
            ],
            createdAt: '2025-01-28T18:30:00.000Z',
            confirmedAt: '2025-01-28T18:35:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1,
        },
      },
    },
  })
  async findMyBookings(
    @CurrentUser('userId') userId: string,
    @Query() query: MyBookingsQueryDto,
  ): Promise<PaginatedResponseDto<BookingDetailResponseDto>> {
    return this.bookingsService.findByUser(userId, query);
  }

  @Post(':id/confirm')
  @Roles(UserRole.CLIENTE, UserRole.ORGANIZADOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar reserva después del pago',
    description:
      'Confirma una reserva después de que el pago fue procesado exitosamente. Genera los tickets con códigos únicos. Este endpoint es llamado internamente por el webhook de Stripe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva confirmada y tickets generados',
    type: ConfirmBookingResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'confirmed',
        paymentStatus: 'succeeded',
        confirmedAt: '2025-01-28T18:35:00.000Z',
        tickets: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            ticketCode: 'TKT-2025-A1B2C3',
            status: 'valid',
          },
          {
            id: '770e8400-e29b-41d4-a716-446655440002',
            ticketCode: 'TKT-2025-D4E5F6',
            status: 'valid',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Reserva ya procesada o expirada',
    schema: {
      example: {
        statusCode: 400,
        message: ['La reserva ya fue procesada con estado: confirmed', 'La reserva ha expirado'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva no encontrada',
    schema: {
      example: {
        statusCode: 404,
        message: 'Reserva no encontrada',
        error: 'Not Found',
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          description: 'ID del Payment Intent de Stripe',
          example: 'pi_1234567890abcdef',
        },
      },
      required: ['paymentIntentId'],
    },
  })
  async confirm(
    @Param('id') id: string,
    @Body('paymentIntentId') paymentIntentId: string,
  ): Promise<ConfirmBookingResponseDto> {
    return this.bookingsService.confirm(id, paymentIntentId);
  }
}
