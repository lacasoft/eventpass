import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from './email.service';
import type { SendTicketsEmailData, SendPaymentFailedEmailData } from './email.service';

export const EMAIL_QUEUE = 'email-queue';

export enum EmailJobType {
  SEND_TICKETS = 'send-tickets',
  SEND_PAYMENT_FAILED = 'send-payment-failed',
}

export interface SendTicketsJobData extends SendTicketsEmailData {
  type: EmailJobType.SEND_TICKETS;
}

export interface SendPaymentFailedJobData extends SendPaymentFailedEmailData {
  type: EmailJobType.SEND_PAYMENT_FAILED;
}

export type EmailJobData = SendTicketsJobData | SendPaymentFailedJobData;

@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process(EmailJobType.SEND_TICKETS)
  async handleSendTickets(job: Job<SendTicketsJobData>): Promise<void> {
    this.logger.log(
      `Processing send tickets email job ${job.id} for booking ${job.data.bookingId}`,
    );

    try {
      await this.emailService.sendTicketsEmail(job.data);
      this.logger.log(`Send tickets email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Send tickets email job ${job.id} failed:`, error);
      throw error; // Will trigger retry
    }
  }

  @Process(EmailJobType.SEND_PAYMENT_FAILED)
  async handleSendPaymentFailed(job: Job<SendPaymentFailedJobData>): Promise<void> {
    this.logger.log(
      `Processing payment failed email job ${job.id} for booking ${job.data.bookingId}`,
    );

    try {
      await this.emailService.sendPaymentFailedEmail(job.data);
      this.logger.log(`Payment failed email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Payment failed email job ${job.id} failed:`, error);
      throw error; // Will trigger retry
    }
  }
}
