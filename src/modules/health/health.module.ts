import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { EmailHealthIndicator } from './indicators/email.health';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { BullQueueHealthIndicator } from './indicators/bull-queue.health';
import { DiskHealthIndicator } from './indicators/disk.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { EmailModule } from '../../common/email/email.module';
import { QUEUE_NAMES } from '../jobs/jobs.constants';
import { EMAIL_QUEUE } from '../../common/email/email-queue.processor';

@Module({
  imports: [
    TerminusModule,
    EmailModule,
    // Importar las colas de Bull para los health indicators
    BullModule.registerQueue(
      { name: QUEUE_NAMES.BOOKINGS },
      { name: QUEUE_NAMES.EVENTS },
      { name: EMAIL_QUEUE },
    ),
  ],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    EmailHealthIndicator,
    StripeHealthIndicator,
    BullQueueHealthIndicator,
    DiskHealthIndicator,
    MemoryHealthIndicator,
  ],
})
export class HealthModule {}
