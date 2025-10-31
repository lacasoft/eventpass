import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketScanController } from './ticket-scan.controller';
import { TicketScanService } from './ticket-scan.service';
import { TicketScanEventsService } from './ticket-scan-events.service';
import { IdempotencyService } from './idempotency.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Ticket } from '../bookings/entities/ticket.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { CheckerAssignment } from '../checker-assignments/entities/checker-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      Ticket,
      Booking,
      Event,
      Venue,
      CheckerAssignment,
    ]),
  ],
  controllers: [TicketScanController],
  providers: [TicketScanService, TicketScanEventsService, IdempotencyService],
  exports: [TicketScanService, TicketScanEventsService, IdempotencyService],
})
export class TicketScanModule {}
