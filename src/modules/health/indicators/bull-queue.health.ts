import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { QUEUE_NAMES } from '../../jobs/jobs.constants';
import { EMAIL_QUEUE } from '../../../common/email/email-queue.processor';

@Injectable()
export class BullQueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue(QUEUE_NAMES.BOOKINGS) private bookingsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EVENTS) private eventsQueue: Queue,
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verificar el estado de cada cola
      const queuesStatus = await Promise.all([
        this.checkQueue('bookings', this.bookingsQueue),
        this.checkQueue('events', this.eventsQueue),
        this.checkQueue('email', this.emailQueue),
      ]);

      // Calcular totales
      const totals = queuesStatus.reduce(
        (acc, queue) => ({
          waiting: acc.waiting + queue.waiting,
          active: acc.active + queue.active,
          failed: acc.failed + queue.failed,
          delayed: acc.delayed + queue.delayed,
        }),
        { waiting: 0, active: 0, failed: 0, delayed: 0 },
      );

      // Verificar si alguna cola tiene demasiados trabajos fallidos
      const maxFailedJobs = 100;
      const hasIssues = queuesStatus.some((queue) => queue.failed > maxFailedJobs);

      if (hasIssues) {
        const problematicQueues = queuesStatus
          .filter((queue) => queue.failed > maxFailedJobs)
          .map((queue) => queue.name);

        throw new Error(
          `Queues with too many failed jobs (>${maxFailedJobs}): ${problematicQueues.join(', ')}`,
        );
      }

      return this.getStatus(key, true, {
        message: 'All Bull queues are healthy',
        queues: queuesStatus,
        totals,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Bull queues check failed',
        this.getStatus(key, false, {
          message: error.message || 'Bull queues are not healthy',
        }),
      );
    }
  }

  private async checkQueue(name: string, queue: Queue): Promise<any> {
    try {
      const [waiting, active, delayed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getDelayedCount(),
        queue.getFailedCount(),
      ]);

      return {
        name,
        waiting,
        active,
        delayed,
        failed,
        isHealthy: failed < 100, // Consideramos no saludable si hay más de 100 jobs fallidos
      };
    } catch (error) {
      return {
        name,
        error: error.message,
        isHealthy: false,
      };
    }
  }
}
