import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { EmailService } from '../../../common/email/email.service';

@Injectable()
export class EmailHealthIndicator extends HealthIndicator {
  constructor(private emailService: EmailService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verificar que el transporter esté configurado
      const transporter = this.emailService.getTransporter();

      if (!transporter) {
        throw new Error('Email transporter is not configured');
      }

      // Verificar la conexión SMTP
      await transporter.verify();

      return this.getStatus(key, true, {
        message: 'Email service is up and running',
      });
    } catch (error) {
      throw new HealthCheckError(
        'Email check failed',
        this.getStatus(key, false, {
          message: error.message || 'Email service is not available',
        }),
      );
    }
  }
}
