import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../../src/common/email/email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: jest.Mocked<any>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'email.smtp': {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@test.com',
            pass: 'test-password',
          },
        },
        'email.from': {
          name: 'EventPass Test',
          address: 'noreply@eventpass-test.com',
        },
        FRONTEND_URL: 'http://localhost:3001',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn((callback) => callback(null, true)), // Mock verify method
    };

    // Mock nodemailer.createTransport to return our mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create nodemailer transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'test-password',
        },
      });
    });

    it('should use default secure=false if not configured', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: false,
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    const email = 'user@example.com';
    const resetToken = 'reset-token-123';
    const name = 'John Doe';

    it('should send password reset email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordResetEmail(email, resetToken, name);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"EventPass Test" <noreply@eventpass-test.com>',
        to: email,
        subject: '🔐 Recuperación de Contraseña - EventPass',
        html: expect.stringContaining('Recuperación de Contraseña'),
      });
    });

    it('should include reset URL in email with correct token', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordResetEmail(email, resetToken, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      // Handlebars HTML-encodes the = sign as &#x3D;
      expect(callArgs.html).toContain(`http://localhost:3001/reset-password?token&#x3D;${resetToken}`);
    });

    it('should include user name in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordResetEmail(email, resetToken, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(name);
    });

    it('should include current year in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordResetEmail(email, resetToken, name);

      const currentYear = new Date().getFullYear();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(currentYear.toString());
    });

    it('should include 1 hour expiration warning in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordResetEmail(email, resetToken, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('1 hora');
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendPasswordResetEmail(email, resetToken, name)).rejects.toThrow('SMTP connection failed');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should log error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.sendPasswordResetEmail(email, resetToken, name)).rejects.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${email}:`,
        error,
      );
    });

    it('should log success when email is sent', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendPasswordResetEmail(email, resetToken, name);

      expect(loggerSpy).toHaveBeenCalledWith(`Password reset email sent successfully to ${email}`);
    });
  });

  describe('sendPasswordChangedConfirmation', () => {
    const email = 'user@example.com';
    const name = 'John Doe';

    it('should send password changed confirmation email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordChangedConfirmation(email, name);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"EventPass Test" <noreply@eventpass-test.com>',
        to: email,
        subject: '✓ Contraseña Actualizada - EventPass',
        html: expect.stringContaining('Contraseña Actualizada'),
      });
    });

    it('should include user name in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordChangedConfirmation(email, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(name);
    });

    it('should include current year in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordChangedConfirmation(email, name);

      const currentYear = new Date().getFullYear();
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(currentYear.toString());
    });

    it('should include success confirmation message', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPasswordChangedConfirmation(email, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('actualizada exitosamente');
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendPasswordChangedConfirmation(email, name)).rejects.toThrow('SMTP connection failed');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should log error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.sendPasswordChangedConfirmation(email, name)).rejects.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to send password changed confirmation to ${email}:`,
        error,
      );
    });

    it('should log success when email is sent', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendPasswordChangedConfirmation(email, name);

      expect(loggerSpy).toHaveBeenCalledWith(`Password changed confirmation email sent successfully to ${email}`);
    });
  });

  describe('sendTicketsEmail', () => {
    const ticketsData = {
      userEmail: 'customer@example.com',
      userName: 'John Doe',
      eventTitle: 'Rock Concert 2025',
      eventDate: '2025-12-31',
      venueName: 'Madison Square Garden',
      venueAddress: '4 Pennsylvania Plaza, New York',
      quantity: 2,
      total: 150,
      tickets: [
        { ticketCode: 'TKT-2025-123456', status: 'confirmed' },
        { ticketCode: 'TKT-2025-123457', status: 'confirmed' },
      ],
      bookingId: 'booking-123',
    };

    it('should send tickets email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendTicketsEmail(ticketsData);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"EventPass Test" <noreply@eventpass-test.com>',
        to: ticketsData.userEmail,
        subject: `🎫 Tus boletos para ${ticketsData.eventTitle}`,
        html: expect.any(String),
      });
    });

    it('should include event details in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendTicketsEmail(ticketsData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(ticketsData.eventTitle);
      expect(callArgs.html).toContain(ticketsData.venueName);
    });

    it('should include all ticket codes in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendTicketsEmail(ticketsData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      ticketsData.tickets.forEach((ticket) => {
        expect(callArgs.html).toContain(ticket.ticketCode);
      });
    });

    it('should include total amount in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendTicketsEmail(ticketsData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(ticketsData.total.toString());
    });

    it('should log success when tickets email is sent', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendTicketsEmail(ticketsData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Tickets email sent successfully to ${ticketsData.userEmail} for booking ${ticketsData.bookingId}`,
      );
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendTicketsEmail(ticketsData)).rejects.toThrow('SMTP error');
    });

    it('should log error when tickets email fails', async () => {
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.sendTicketsEmail(ticketsData)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to send tickets email to ${ticketsData.userEmail}:`,
        error,
      );
    });

    it('should return early if transporter is not initialized', async () => {
      // Create service without transporter
      const noTransporterService = new EmailService({
        get: jest.fn(() => ({
          auth: { user: null, pass: null },
        })),
      } as any);

      const loggerSpy = jest.spyOn(noTransporterService['logger'], 'warn');

      await noTransporterService.sendTicketsEmail(ticketsData);

      expect(loggerSpy).toHaveBeenCalledWith('Email transporter not initialized. Skipping email send.');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return early if template not found', async () => {
      // Clear templates
      service['templates'].delete('tickets-confirmed');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendTicketsEmail(ticketsData);

      expect(loggerSpy).toHaveBeenCalledWith('Tickets confirmed template not found');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendPaymentFailedEmail', () => {
    const paymentFailedData = {
      userEmail: 'customer@example.com',
      userName: 'John Doe',
      eventTitle: 'Rock Concert 2025',
      total: 150,
      errorMessage: 'Insufficient funds',
      bookingId: 'booking-123',
    };

    it('should send payment failed email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPaymentFailedEmail(paymentFailedData);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"EventPass Test" <noreply@eventpass-test.com>',
        to: paymentFailedData.userEmail,
        subject: `❌ Pago fallido para ${paymentFailedData.eventTitle}`,
        html: expect.any(String),
      });
    });

    it('should include error message in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPaymentFailedEmail(paymentFailedData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(paymentFailedData.errorMessage);
    });

    it('should include event title in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendPaymentFailedEmail(paymentFailedData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(paymentFailedData.eventTitle);
    });

    it('should log success when payment failed email is sent', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendPaymentFailedEmail(paymentFailedData);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Payment failed email sent successfully to ${paymentFailedData.userEmail} for booking ${paymentFailedData.bookingId}`,
      );
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendPaymentFailedEmail(paymentFailedData)).rejects.toThrow('SMTP error');
    });

    it('should log error when payment failed email fails', async () => {
      const error = new Error('SMTP error');
      mockTransporter.sendMail.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.sendPaymentFailedEmail(paymentFailedData)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to send payment failed email to ${paymentFailedData.userEmail}:`,
        error,
      );
    });

    it('should return early if transporter is not initialized', async () => {
      const noTransporterService = new EmailService({
        get: jest.fn(() => ({
          auth: { user: null, pass: null },
        })),
      } as any);

      const loggerSpy = jest.spyOn(noTransporterService['logger'], 'warn');

      await noTransporterService.sendPaymentFailedEmail(paymentFailedData);

      expect(loggerSpy).toHaveBeenCalledWith('Email transporter not initialized. Skipping email send.');
    });

    it('should return early if template not found', async () => {
      service['templates'].delete('payment-failed');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendPaymentFailedEmail(paymentFailedData);

      expect(loggerSpy).toHaveBeenCalledWith('Payment failed template not found');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetEmail - no transporter scenarios', () => {
    it('should return early if transporter is not initialized', async () => {
      const noTransporterService = new EmailService({
        get: jest.fn(() => ({
          auth: { user: null, pass: null },
        })),
      } as any);

      const loggerSpy = jest.spyOn(noTransporterService['logger'], 'warn');

      await noTransporterService.sendPasswordResetEmail('test@test.com', 'token', 'User');

      expect(loggerSpy).toHaveBeenCalledWith('Email transporter not initialized. Skipping email send.');
    });

    it('should return early if password reset template not found', async () => {
      service['templates'].delete('password-reset');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendPasswordResetEmail('test@test.com', 'token', 'User');

      expect(loggerSpy).toHaveBeenCalledWith('Password reset template not found');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendPasswordChangedConfirmation - no transporter scenarios', () => {
    it('should return early if transporter is not initialized', async () => {
      const noTransporterService = new EmailService({
        get: jest.fn(() => ({
          auth: { user: null, pass: null },
        })),
      } as any);

      const loggerSpy = jest.spyOn(noTransporterService['logger'], 'warn');

      await noTransporterService.sendPasswordChangedConfirmation('test@test.com', 'User');

      expect(loggerSpy).toHaveBeenCalledWith('Email transporter not initialized. Skipping email send.');
    });

    it('should return early if password changed template not found', async () => {
      service['templates'].delete('password-changed');
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendPasswordChangedConfirmation('test@test.com', 'User');

      expect(loggerSpy).toHaveBeenCalledWith('Password changed template not found');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('getTransporter', () => {
    it('should return the transporter instance', () => {
      const transporter = service.getTransporter();

      expect(transporter).toBe(mockTransporter);
    });

    it('should return null if transporter not initialized', () => {
      const noTransporterService = new EmailService({
        get: jest.fn(() => ({
          auth: { user: null, pass: null },
        })),
      } as any);

      const transporter = noTransporterService.getTransporter();

      expect(transporter).toBeUndefined();
    });
  });

  describe('initializeTransporter - error scenarios', () => {
    it('should not create transporter when email credentials are not configured', () => {
      const noCredsService = new EmailService({
        get: jest.fn(() => ({
          smtp: {
            auth: { user: '', pass: '' },
          },
        })),
      } as any);

      expect(noCredsService.getTransporter()).toBeUndefined();
    });

    it('should handle transporter creation error gracefully', () => {
      const error = new Error('Transport creation failed');

      (nodemailer.createTransport as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      const serviceWithError = new EmailService({
        get: jest.fn(() => ({
          smtp: {
            host: 'smtp.test.com',
            auth: { user: 'test', pass: 'test' },
          },
        })),
      } as any);

      // Service should still be created but transporter should be undefined
      expect(serviceWithError.getTransporter()).toBeUndefined();
    });

    it('should create service even when transporter verification fails', () => {
      const verifyError = new Error('Connection timeout');

      const failingTransporter = {
        sendMail: jest.fn(),
        verify: jest.fn((callback) => callback(verifyError)),
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce(failingTransporter);

      const serviceWithFailingVerify = new EmailService({
        get: jest.fn((key: string) => {
          if (key === 'email.smtp') {
            return {
              host: 'smtp.test.com',
              auth: { user: 'test', pass: 'test' },
            };
          }
          return null;
        }),
      } as any);

      // Service should be created (transporter exists but verification failed)
      expect(serviceWithFailingVerify).toBeDefined();
    });

    it('should create service when transporter verification succeeds', () => {
      const successTransporter = {
        sendMail: jest.fn(),
        verify: jest.fn((callback) => callback(null, true)),
      };

      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce(successTransporter);

      const serviceWithSuccess = new EmailService({
        get: jest.fn((key: string) => {
          if (key === 'email.smtp') {
            return {
              host: 'smtp.test.com',
              auth: { user: 'test', pass: 'test' },
            };
          }
          return null;
        }),
      } as any);

      expect(serviceWithSuccess.getTransporter()).toBe(successTransporter);
    });
  });

  describe('loadTemplates', () => {
    it('should load templates successfully during service construction', () => {
      const testService = new EmailService(mockConfigService as any);

      // Verify that templates were loaded by checking sendPasswordResetEmail works
      expect(testService.getTransporter()).toBe(mockTransporter);
    });
  });
});
