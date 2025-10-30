import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { Payment } from '../../../../src/modules/payments/entities/payment.entity';
import { Booking } from '../../../../src/modules/bookings/entities/booking.entity';
import { Event } from '../../../../src/modules/events/entities/event.entity';
import { BookingsService } from '../../../../src/modules/bookings/bookings.service';
import { PaymentStatus } from '../../../../src/modules/payments/enums/payment-status.enum';
import { BookingStatus } from '../../../../src/modules/bookings/enums/booking-status.enum';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentRepository: any;
  let mockBookingRepository: any;
  let mockEventRepository: any;
  let mockBookingsService: any;
  let mockConfigService: any;
  let mockEmailQueue: any;
  let mockDataSource: any;
  let mockQueryRunner: any;
  let mockStripe: any;

  const mockBooking = {
    id: 'booking-uuid-123',
    userId: 'user-uuid-123',
    eventId: 'event-uuid-123',
    quantity: 2,
    unitPrice: 50,
    subtotal: 100,
    serviceFee: 15,
    total: 115,
    status: BookingStatus.PENDING,
    expiresAt: new Date(Date.now() + 600000), // 10 minutos en el futuro
    event: {
      id: 'event-uuid-123',
      title: 'Test Event',
      eventDate: new Date(Date.now() + 86400000),
      venue: { name: 'Test Venue', address: 'Test Address' },
    },
    user: {
      id: 'user-uuid-123',
      email: 'user@example.com',
      firstName: 'John',
    },
  };

  const mockPayment = {
    id: 'payment-uuid-123',
    stripePaymentIntentId: 'pi_stripe_123',
    bookingId: 'booking-uuid-123',
    userId: 'user-uuid-123',
    eventId: 'event-uuid-123',
    amount: 11500,
    currency: 'usd',
    status: PaymentStatus.PENDING,
    stripeEventId: null,
  };

  beforeEach(async () => {
    // Mock QueryRunner
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    mockBookingRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockEventRepository = {};

    mockBookingsService = {
      confirm: jest.fn().mockResolvedValue({
        id: 'booking-uuid-123',
        status: BookingStatus.CONFIRMED,
        tickets: [
          { id: 'ticket-1', ticketCode: 'TKT-2025-ABC123' },
          { id: 'ticket-2', ticketCode: 'TKT-2025-DEF456' },
        ],
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock_key';
        if (key === 'STRIPE_CURRENCY') return 'usd';
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_secret';
        return null;
      }),
    };

    mockEmailQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getQueueToken('email-queue'),
          useValue: mockEmailQueue,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);

    // Mock Stripe instance
    mockStripe = (service as any).stripe;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createIntent', () => {
    const createPaymentIntentDto = {
      bookingId: 'booking-uuid-123',
    };

    it('should create payment intent successfully', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_stripe_123',
        client_secret: 'pi_123_secret_abc',
        amount: 11500,
        currency: 'usd',
        metadata: {
          bookingId: 'booking-uuid-123',
        },
      });
      mockBookingRepository.save.mockResolvedValue(mockBooking);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createIntent(createPaymentIntentDto, 'user-uuid-123');

      expect(result.clientSecret).toBe('pi_123_secret_abc');
      expect(result.amount).toBe(11500);
      expect(result.currency).toBe('usd');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 11500,
          currency: 'usd',
          metadata: expect.objectContaining({
            bookingId: 'booking-uuid-123',
          }),
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow('Reserva no encontrada');
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);

      await expect(
        service.createIntent(createPaymentIntentDto, 'different-user-id'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createIntent(createPaymentIntentDto, 'different-user-id'),
      ).rejects.toThrow('No tienes permiso para pagar esta reserva');
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      mockBookingRepository.findOne.mockResolvedValue(confirmedBooking);

      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(/La reserva ya fue procesada/);
    });

    it('should throw BadRequestException if booking has expired', async () => {
      const expiredBooking = {
        ...mockBooking,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockBookingRepository.findOne.mockResolvedValue(expiredBooking);

      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow('La reserva ha expirado');
    });

    it('should convert total to cents correctly', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_stripe_123',
        client_secret: 'pi_123_secret_abc',
        amount: 11500,
        currency: 'usd',
        metadata: {},
      });
      mockBookingRepository.save.mockResolvedValue(mockBooking);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      await service.createIntent(createPaymentIntentDto, 'user-uuid-123');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 11500, // 115 * 100
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    const mockSignature = 'test-signature';
    const mockRawBody = Buffer.from('test-body');

    it('should handle webhook successfully', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_123',
            amount: 11500,
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null); // No duplicado

      // Mock para handlePaymentSucceeded
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockPayment) // Payment
        .mockResolvedValueOnce(mockBooking); // Booking
      mockQueryRunner.manager.save.mockResolvedValue(mockPayment);

      const result = await service.handleWebhook(mockSignature, mockRawBody);

      expect(result.received).toBe(true);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockRawBody,
        mockSignature,
        'whsec_test_secret',
      );
    });

    it('should throw BadRequestException if signature is invalid', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(mockSignature, mockRawBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.handleWebhook(mockSignature, mockRawBody)).rejects.toThrow(
        'Signature inválida',
      );
    });

    it('should skip duplicate events (idempotency)', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        stripeEventId: 'evt_test_123',
      });

      const result = await service.handleWebhook(mockSignature, mockRawBody);

      expect(result.received).toBe(true);
      // No debe procesar el evento
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_123',
            amount: 11500,
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null);

      // Mock para handlePaymentSucceeded
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(pendingPayment)
        .mockResolvedValueOnce(mockBooking);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });

      await service.handleWebhook(mockSignature, mockRawBody);

      expect(mockBookingsService.confirm).toHaveBeenCalledWith(
        'booking-uuid-123',
        'pi_stripe_123',
      );
      expect(mockEmailQueue.add).toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_stripe_123',
            last_payment_error: {
              message: 'Card declined',
              code: 'card_declined',
            },
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null);

      // Mock para handlePaymentFailed
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockBooking);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });

      await service.handleWebhook(mockSignature, mockRawBody);

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Booking,
        { id: mockPayment.bookingId },
        { status: BookingStatus.FAILED },
      );
      expect(mockEmailQueue.add).toHaveBeenCalled();
    });
  });

  describe('handlePaymentSucceeded (private)', () => {
    it('should skip if payment already succeeded (idempotency)', async () => {
      const succeededPayment = { ...mockPayment, status: PaymentStatus.SUCCEEDED };
      mockQueryRunner.manager.findOne.mockResolvedValue(succeededPayment);

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_123',
            amount: 11500,
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      // Call private method through webhook
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await service.handleWebhook('sig', Buffer.from('body'));

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockBookingsService.confirm).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if amount mismatch', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockBooking);

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_stripe_123',
            amount: 99999, // Monto incorrecto
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook('sig', Buffer.from('body')),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed (private)', () => {
    it('should release tickets back to event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_stripe_123',
            last_payment_error: {
              message: 'Insufficient funds',
              code: 'insufficient_funds',
            },
            metadata: { bookingId: 'booking-uuid-123' },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockPaymentRepository.findOne.mockResolvedValue(null);

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockBooking);
      mockQueryRunner.manager.save.mockResolvedValue(mockPayment);
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });

      await service.handleWebhook('sig', Buffer.from('body'));

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Event,
        { id: mockBooking.eventId },
        { availableTickets: expect.any(Function) },
      );
    });
  });
});
