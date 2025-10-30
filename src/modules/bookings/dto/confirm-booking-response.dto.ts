import { ApiProperty } from '@nestjs/swagger';
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

export class ConfirmBookingResponseDto {
  @ApiProperty({
    description: 'ID de la reserva',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Estado de la reserva',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Estado del pago en Stripe',
    example: 'succeeded',
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Fecha de confirmación del pago',
    example: '2025-01-28T18:35:00.000Z',
  })
  confirmedAt: Date;

  @ApiProperty({
    description: 'Lista de tickets generados',
    type: [TicketDto],
  })
  tickets: TicketDto[];
}
