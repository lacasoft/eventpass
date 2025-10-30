import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { QUEUE_NAMES, JOB_NAMES } from '../jobs.constants';

/**
 * Processor para Job #31: Completar Eventos Pasados
 *
 * Trigger: Cada día a las 2:00 AM (configurable)
 * Proceso:
 * 1. Buscar eventos con:
 *    - isActive = true
 *    - isCancelled = false
 *    - eventDate < NOW()
 * 2. Actualizar isActive = false (marcar como completado)
 * 3. Registrar en logs
 */
@Processor(QUEUE_NAMES.EVENTS)
export class CompletePastEventsProcessor {
  private readonly logger = new Logger(CompletePastEventsProcessor.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  @Process(JOB_NAMES.COMPLETE_PAST_EVENTS)
  async handleCompletePastEvents(job: Job): Promise<void> {
    this.logger.log('Starting completion of past events');

    try {
      // 1. Buscar eventos activos cuya fecha ya pasó
      const pastEvents = await this.eventRepository.find({
        where: {
          isActive: true,
          isCancelled: false,
          eventDate: LessThan(new Date()),
        },
      });

      if (pastEvents.length === 0) {
        this.logger.log('No past events found to complete');
        return;
      }

      this.logger.log(`Found ${pastEvents.length} past events to complete`);

      // 2. Actualizar cada evento a completado (isActive = false)
      let completedCount = 0;
      let errorCount = 0;

      for (const event of pastEvents) {
        try {
          event.isActive = false;
          await this.eventRepository.save(event);

          completedCount++;
          this.logger.log(
            `Completed event ${event.id} (${event.title}) - Date: ${event.eventDate}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(`Error completing event ${event.id}: ${error.message}`, error.stack);
          // Continuar con el siguiente evento en caso de error
        }
      }

      this.logger.log(`Completion finished: ${completedCount} events completed, ${errorCount} errors`);
    } catch (error) {
      this.logger.error(`Error in complete past events job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
