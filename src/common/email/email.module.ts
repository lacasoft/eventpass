import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueueProcessor, EMAIL_QUEUE } from './email-queue.processor';
import emailConfig from '../../config/email.config';

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3, // Reintentar hasta 3 veces
        backoff: {
          type: 'exponential',
          delay: 2000, // Esperar 2s, luego 4s, luego 8s
        },
        removeOnComplete: true, // Limpiar jobs completados
        removeOnFail: false, // Mantener jobs fallidos para debugging
      },
    }),
  ],
  providers: [EmailService, EmailQueueProcessor],
  exports: [EmailService, BullModule],
})
export class EmailModule {}
