import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface TicketData {
  ticketCode: string;
  status: string;
}

export interface SendTicketsEmailData {
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  quantity: number;
  total: number;
  tickets: TicketData[];
  bookingId: string;
}

export interface SendPaymentFailedEmailData {
  userEmail: string;
  userName: string;
  eventTitle: string;
  total: number;
  errorMessage: string;
  bookingId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    const smtpConfig = this.configService.get('email.smtp');

    if (!smtpConfig?.auth?.user || !smtpConfig?.auth?.pass) {
      this.logger.warn('Email credentials not configured. Email sending will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection (non-blocking)
      this.transporter.verify((error) => {
        if (error) {
          this.logger.warn('Email transporter verification failed. Emails may not be sent.');
          this.logger.warn(
            `SMTP Error: ${error.message}. Check your EMAIL_SMTP_* configuration in .env`,
          );
        } else {
          this.logger.log('Email transporter is ready');
        }
      });
    } catch (error) {
      this.logger.error('Failed to create email transporter:', error);
      this.transporter = null;
    }
  }

  private loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '..', '..', 'templates', 'emails');

      // Load tickets confirmed template
      const ticketsConfirmedPath = path.join(templatesDir, 'tickets-confirmed.hbs');
      if (fs.existsSync(ticketsConfirmedPath)) {
        const ticketsTemplate = fs.readFileSync(ticketsConfirmedPath, 'utf-8');
        this.templates.set('tickets-confirmed', handlebars.compile(ticketsTemplate));
      }

      // Load payment failed template
      const paymentFailedPath = path.join(templatesDir, 'payment-failed.hbs');
      if (fs.existsSync(paymentFailedPath)) {
        const paymentTemplate = fs.readFileSync(paymentFailedPath, 'utf-8');
        this.templates.set('payment-failed', handlebars.compile(paymentTemplate));
      }

      // Load password reset template
      const passwordResetPath = path.join(templatesDir, 'password-reset.hbs');
      if (fs.existsSync(passwordResetPath)) {
        const resetTemplate = fs.readFileSync(passwordResetPath, 'utf-8');
        this.templates.set('password-reset', handlebars.compile(resetTemplate));
      }

      // Load password changed template
      const passwordChangedPath = path.join(templatesDir, 'password-changed.hbs');
      if (fs.existsSync(passwordChangedPath)) {
        const changedTemplate = fs.readFileSync(passwordChangedPath, 'utf-8');
        this.templates.set('password-changed', handlebars.compile(changedTemplate));
      }

      this.logger.log(`Loaded ${this.templates.size} email template(s)`);
    } catch (error) {
      this.logger.error('Error loading email templates:', error);
    }
  }

  async sendTicketsEmail(data: SendTicketsEmailData): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized. Skipping email send.');
      return;
    }

    try {
      const template = this.templates.get('tickets-confirmed');
      if (!template) {
        this.logger.error('Tickets confirmed template not found');
        return;
      }

      const appConfig = this.configService.get('email.app');

      const html = template({
        ...data,
        appName: appConfig.name,
        supportEmail: appConfig.supportEmail,
      });

      const fromConfig = this.configService.get('email.from');

      await this.transporter.sendMail({
        from: `"${fromConfig.name}" <${fromConfig.address}>`,
        to: data.userEmail,
        subject: `🎫 Tus boletos para ${data.eventTitle}`,
        html,
      });

      this.logger.log(
        `Tickets email sent successfully to ${data.userEmail} for booking ${data.bookingId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send tickets email to ${data.userEmail}:`, error);
      throw error;
    }
  }

  async sendPaymentFailedEmail(data: SendPaymentFailedEmailData): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized. Skipping email send.');
      return;
    }

    try {
      const template = this.templates.get('payment-failed');
      if (!template) {
        this.logger.error('Payment failed template not found');
        return;
      }

      const appConfig = this.configService.get('email.app');

      const html = template({
        ...data,
        appName: appConfig.name,
        supportEmail: appConfig.supportEmail,
      });

      const fromConfig = this.configService.get('email.from');

      await this.transporter.sendMail({
        from: `"${fromConfig.name}" <${fromConfig.address}>`,
        to: data.userEmail,
        subject: `❌ Pago fallido para ${data.eventTitle}`,
        html,
      });

      this.logger.log(
        `Payment failed email sent successfully to ${data.userEmail} for booking ${data.bookingId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send payment failed email to ${data.userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized. Skipping email send.');
      return;
    }

    try {
      const template = this.templates.get('password-reset');
      if (!template) {
        this.logger.error('Password reset template not found');
        return;
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      const appConfig = this.configService.get('email.app');

      const html = template({
        userName,
        resetUrl,
        year: new Date().getFullYear(),
        appName: appConfig.name,
        supportEmail: appConfig.supportEmail,
      });

      const fromConfig = this.configService.get('email.from');

      await this.transporter.sendMail({
        from: `"${fromConfig.name}" <${fromConfig.address}>`,
        to: email,
        subject: '🔐 Recuperación de Contraseña - EventPass',
        html,
      });

      this.logger.log(`Password reset email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Enviar email de confirmación de cambio de contraseña
   */
  async sendPasswordChangedConfirmation(email: string, userName: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized. Skipping email send.');
      return;
    }

    try {
      const template = this.templates.get('password-changed');
      if (!template) {
        this.logger.error('Password changed template not found');
        return;
      }

      const appConfig = this.configService.get('email.app');

      const html = template({
        userName,
        year: new Date().getFullYear(),
        appName: appConfig.name,
        supportEmail: appConfig.supportEmail,
      });

      const fromConfig = this.configService.get('email.from');

      await this.transporter.sendMail({
        from: `"${fromConfig.name}" <${fromConfig.address}>`,
        to: email,
        subject: '✓ Contraseña Actualizada - EventPass',
        html,
      });

      this.logger.log(`Password changed confirmation email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password changed confirmation to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Get the nodemailer transporter instance for health checks
   */
  getTransporter(): Transporter | null {
    return this.transporter;
  }
}
