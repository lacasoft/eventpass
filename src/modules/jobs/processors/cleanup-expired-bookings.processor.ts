import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Event } from '../../events/entities/event.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { QUEUE_NAMES, JOB_NAMES } from '../jobs.constants';

/**
 * Processor para Job #30: Limpiar Reservas Expiradas (Backup)
 *
 * Trigger: Cada 5 minutos (cron) - configurable
 * Proceso:
 * 1. Buscar bookings con:
 *    - status = 'pending'
 *    - expiresAt < NOW()
 * 2. Para cada uno:
 *    - Actualizar status = 'expired'
 *    - Incrementar available_tickets
 *    - Registrar en logs
 *
 * Propósito: Backup en caso de que el job individual falle
 */
@Processor(QUEUE_NAMES.BOOKINGS)
export class CleanupExpiredBookingsProcessor {
  private readonly logger = new Logger(CleanupExpiredBookingsProcessor.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  @Process(JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS)
  async handleCleanupExpiredBookings(job: Job): Promise<void> {
    this.logger.log('Starting cleanup of expired bookings');

    try {
      // 1. Buscar bookings pendientes que ya expiraron
      const expiredBookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.PENDING,
          expiresAt: LessThan(new Date()),
        },
        relations: ['event'],
      });

      if (expiredBookings.length === 0) {
        this.logger.log('No expired bookings found');
        return;
      }

      this.logger.log(`Found ${expiredBookings.length} expired bookings to process`);

      // 2. Procesar cada booking expirado
      let processedCount = 0;
      let errorCount = 0;

      for (const booking of expiredBookings) {
        try {
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
          }

          processedCount++;
          this.logger.log(
            `Expired booking ${booking.id}, released ${booking.quantity} tickets for event ${booking.eventId}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error expiring booking ${booking.id}: ${error.message}`,
            error.stack,
          );
          // Continuar con el siguiente booking en caso de error
        }
      }

      this.logger.log(
        `Cleanup completed: ${processedCount} bookings expired, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(`Error in cleanup expired bookings job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
