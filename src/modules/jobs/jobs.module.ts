import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { ExpireBookingProcessor } from './processors/expire-booking.processor';
import { CleanupExpiredBookingsProcessor } from './processors/cleanup-expired-bookings.processor';
import { CompletePastEventsProcessor } from './processors/complete-past-events.processor';
import { Booking } from '../bookings/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { QUEUE_NAMES } from './jobs.constants';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Booking, Event]),
    // Registrar las colas de Bull
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.BOOKINGS,
      },
      {
        name: QUEUE_NAMES.EVENTS,
      },
    ),
  ],
  providers: [
    JobsService,
    // Processors
    ExpireBookingProcessor,
    CleanupExpiredBookingsProcessor,
    CompletePastEventsProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
