import { ApiProperty } from '@nestjs/swagger';
import { ScanStatus } from '../enums/scan-status.enum';
import { Ticket } from '../../bookings/entities/ticket.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { AttendanceRecord } from '../entities/attendance-record.entity';

export class ScanResponseDto {
  @ApiProperty({
    description: 'Estado del escaneo',
    enum: ScanStatus,
    example: ScanStatus.VALID,
  })
  status: ScanStatus;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Entrada permitida',
  })
  message: string;

  @ApiProperty({
    description: 'Información del ticket (si se encontró)',
    required: false,
  })
  ticket?: Partial<Ticket>;

  @ApiProperty({
    description: 'Información de la reserva (si se encontró)',
    required: false,
  })
  booking?: Partial<Booking>;

  @ApiProperty({
    description: 'Registro de asistencia creado',
    required: false,
  })
  attendanceRecord?: AttendanceRecord;

  @ApiProperty({
    description: 'Timestamp del escaneo',
    example: '2025-10-31T13:00:00.000Z',
  })
  scannedAt: Date;
}
