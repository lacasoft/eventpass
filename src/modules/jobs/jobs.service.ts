import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JOB_NAMES, JOB_PRIORITIES } from './jobs.constants';

/**
 * Servicio para gestionar los jobs de la aplicación
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BOOKINGS)
    private readonly bookingsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EVENTS)
    private readonly eventsQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Inicializar jobs recurrentes al arrancar la aplicación
   */
  async onModuleInit() {
    await this.setupRecurringJobs();
  }

  /**
   * Configurar jobs recurrentes (cron)
   */
  private async setupRecurringJobs() {
    try {
      // Job #30: Limpiar reservas expiradas (cada N minutos)
      const cleanupInterval = this.configService.get<number>('jobs.cleanupExpiredBookingsInterval', 5);
      await this.bookingsQueue.add(
        JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
        {},
        {
          repeat: {
            every: cleanupInterval * 60 * 1000, // Convertir minutos a milisegundos
          },
          priority: JOB_PRIORITIES.NORMAL,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Cleanup expired bookings job scheduled every ${cleanupInterval} minutes`);

      // Job #31: Completar eventos pasados (diario a las 2:00 AM)
      const completionTime = this.configService.get<string>('jobs.completePastEventsTime', '02:00');
      const [hour, minute] = completionTime.split(':').map(Number);

      await this.eventsQueue.add(
        JOB_NAMES.COMPLETE_PAST_EVENTS,
        {},
        {
          repeat: {
            cron: `${minute} ${hour} * * *`, // Formato: minuto hora * * *
          },
          priority: JOB_PRIORITIES.NORMAL,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Complete past events job scheduled daily at ${completionTime}`);
    } catch (error) {
      this.logger.error(`Error setting up recurring jobs: ${error.message}`, error.stack);
    }
  }

  /**
   * Job #29: Programar expiración de una reserva individual
   *
   * @param bookingId ID de la reserva
   * @returns Job creado
   */
  async scheduleBookingExpiration(bookingId: string) {
    const expirationTime = this.configService.get<number>('jobs.bookingExpirationTime', 10);

    const job = await this.bookingsQueue.add(
      JOB_NAMES.EXPIRE_BOOKING,
      { bookingId },
      {
        delay: expirationTime * 60 * 1000, // Convertir minutos a milisegundos
        priority: JOB_PRIORITIES.HIGH,
        attempts: 3, // Reintentar hasta 3 veces en caso de error
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 segundos
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Scheduled booking expiration for ${bookingId} in ${expirationTime} minutes (Job ID: ${job.id})`,
    );

    return job;
  }

  /**
   * Cancelar job de expiración de reserva
   *
   * @param bookingId ID de la reserva
   */
  async cancelBookingExpiration(bookingId: string): Promise<void> {
    try {
      // Buscar jobs pendientes para este booking
      const jobs = await this.bookingsQueue.getJobs(['delayed', 'waiting']);

      for (const job of jobs) {
        if (job.name === JOB_NAMES.EXPIRE_BOOKING && job.data.bookingId === bookingId) {
          await job.remove();
          this.logger.log(`Cancelled expiration job for booking ${bookingId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error cancelling booking expiration for ${bookingId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Forzar ejecución manual de cleanup de reservas expiradas
   */
  async triggerCleanupExpiredBookings() {
    const job = await this.bookingsQueue.add(
      JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
      {},
      {
        priority: JOB_PRIORITIES.HIGH,
        removeOnComplete: true,
      },
    );

    this.logger.log(`Manually triggered cleanup expired bookings job (Job ID: ${job.id})`);
    return job;
  }

  /**
   * Forzar ejecución manual de completar eventos pasados
   */
  async triggerCompletePastEvents() {
    const job = await this.eventsQueue.add(
      JOB_NAMES.COMPLETE_PAST_EVENTS,
      {},
      {
        priority: JOB_PRIORITIES.HIGH,
        removeOnComplete: true,
      },
    );

    this.logger.log(`Manually triggered complete past events job (Job ID: ${job.id})`);
    return job;
  }
}
