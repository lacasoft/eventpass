import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

class TicketDto {
  @ApiProperty({
    description: 'ID del ticket',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Código único del ticket',
    example: 'TKT-2025-A1B2C3',
  })
  ticketCode: string;

  @ApiProperty({
    description: 'Estado del ticket',
    enum: TicketStatus,
    example: TicketStatus.VALID,
  })
  status: TicketStatus;
}

class VenueDto {
  @ApiProperty({ description: 'ID del venue', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Nombre del venue', example: 'Auditorio Nacional' })
  name: string;

  @ApiProperty({
    description: 'Dirección del venue',
    example: 'Paseo de la Reforma 50, Ciudad de México',
  })
  address: string;

  @ApiProperty({ description: 'Ciudad', example: 'Ciudad de México' })
  city: string;
}

class EventDto {
  @ApiProperty({ description: 'ID del evento', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Título del evento', example: 'Festival Rock 2025' })
  title: string;

  @ApiProperty({
    description: 'Fecha del evento',
    example: '2025-12-31T20:00:00.000Z',
  })
  eventDate: Date;

  @ApiProperty({ description: 'Información del venue', type: VenueDto })
  venue: VenueDto;
}

export class BookingDetailResponseDto {
  @ApiProperty({ description: 'ID de la reserva', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Información del evento', type: EventDto })
  event: EventDto;

  @ApiProperty({ description: 'Cantidad de boletos', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 50.0 })
  unitPrice: number;

  @ApiProperty({ description: 'Subtotal', example: 100.0 })
  subtotal: number;

  @ApiProperty({ description: 'Tarifa de servicio (15%)', example: 15.0 })
  serviceFee: number;

  @ApiProperty({ description: 'Total a pagar', example: 115.0 })
  total: number;

  @ApiProperty({
    description: 'Estado de la reserva',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiPropertyOptional({
    description: 'Estado del pago en Stripe',
    example: 'succeeded',
  })
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Lista de tickets (solo si está confirmada)',
    type: [TicketDto],
  })
  tickets?: TicketDto[];

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-01-28T18:30:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Fecha de confirmación',
    example: '2025-01-28T18:35:00.000Z',
  })
  confirmedAt?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de expiración (solo para reservas pendientes)',
    example: '2025-01-28T18:40:00.000Z',
  })
  expiresAt?: Date;
}
