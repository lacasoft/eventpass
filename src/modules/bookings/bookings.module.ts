import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { Payment } from '../payments/entities/payment.entity';
import { RedisLockService } from '../../common/redis/redis-lock.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Ticket, Event, Payment]),
    forwardRef(() => JobsModule), // Usar forwardRef para evitar dependencia circular
  ],
  controllers: [BookingsController],
  providers: [BookingsService, RedisLockService],
  exports: [BookingsService],
})
export class BookingsModule {}
