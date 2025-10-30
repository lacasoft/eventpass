import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Event } from '../../events/entities/event.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { QUEUE_NAMES, JOB_NAMES } from '../jobs.constants';

interface ExpireBookingJobData {
  bookingId: string;
}

/**
 * Processor para Job #29: Expirar Reservas Individuales
 *
 * Trigger: 10 minutos después de crear reserva (configurable)
 * Frecuencia: Una vez por reserva (delayed job)
 *
 * Proceso:
 * 1. Buscar booking por ID
 * 2. Si status = 'pending':
 *    - Actualizar status = 'expired'
 *    - Incrementar available_tickets del evento
 *    - Registrar en logs
 */
@Processor(QUEUE_NAMES.BOOKINGS)
export class ExpireBookingProcessor {
  private readonly logger = new Logger(ExpireBookingProcessor.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  @Process(JOB_NAMES.EXPIRE_BOOKING)
  async handleExpireBooking(job: Job<ExpireBookingJobData>): Promise<void> {
    const { bookingId } = job.data;

    this.logger.log(`Processing expire booking job for booking ID: ${bookingId}`);

    try {
      // 1. Buscar booking por ID
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['event'],
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found`);
        return;
      }

      // 2. Si status = 'pending', expirar la reserva
      if (booking.status === BookingStatus.PENDING) {
        // Actualizar status a cancelled (por expiración)
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancellationReason = 'Reserva expirada automáticamente';
        await this.bookingRepository.save(booking);

        // Incrementar available_tickets del evento
        if (booking.event) {
          await this.eventRepository.increment(
            { id: booking.eventId },
            'availableTickets',
            booking.quantity,
          );

          // Decrementar soldTickets
          await this.eventRepository.decrement(
            { id: booking.eventId },
            'soldTickets',
            booking.quantity,
          );

          this.logger.log(
            `Booking ${bookingId} expired. Released ${booking.quantity} tickets for event ${booking.eventId}`,
          );
        }
      } else {
        this.logger.log(
          `Booking ${bookingId} is not pending (status: ${booking.status}), skipping expiration`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing expire booking job for ${bookingId}: ${error.message}`,
        error.stack,
      );
      throw error; // Permitir que Bull retry el job
    }
  }
}
