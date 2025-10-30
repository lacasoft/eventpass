import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../../../../src/modules/payments/payments.controller';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { CreatePaymentIntentDto } from '../../../../src/modules/payments/dto/create-payment-intent.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockPaymentsService = {
    createIntent: jest.fn(),
    handleWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createIntent', () => {
    const createPaymentIntentDto: CreatePaymentIntentDto = {
      bookingId: 'booking-uuid-123',
    };

    const mockPaymentIntentResponse = {
      clientSecret: 'pi_123_secret_abc',
      amount: 11500,
      currency: 'usd',
    };

    it('should create payment intent successfully', async () => {
      paymentsService.createIntent.mockResolvedValue(mockPaymentIntentResponse);

      const result = await controller.createIntent(createPaymentIntentDto, 'user-uuid-123');

      expect(result).toEqual(mockPaymentIntentResponse);
      expect(paymentsService.createIntent).toHaveBeenCalledWith(
        createPaymentIntentDto,
        'user-uuid-123',
      );
    });

    it('should pass userId from decorator to service', async () => {
      paymentsService.createIntent.mockResolvedValue(mockPaymentIntentResponse);

      await controller.createIntent(createPaymentIntentDto, 'user-uuid-456');

      expect(paymentsService.createIntent).toHaveBeenCalledWith(
        createPaymentIntentDto,
        'user-uuid-456',
      );
    });

    it('should handle different booking IDs', async () => {
      const differentBooking: CreatePaymentIntentDto = {
        bookingId: 'booking-uuid-789',
      };

      paymentsService.createIntent.mockResolvedValue(mockPaymentIntentResponse);

      await controller.createIntent(differentBooking, 'user-uuid-123');

      expect(paymentsService.createIntent).toHaveBeenCalledWith(
        differentBooking,
        'user-uuid-123',
      );
    });

    it('should handle NotFoundException from service', async () => {
      const error = new Error('Reserva no encontrada');
      paymentsService.createIntent.mockRejectedValue(error);

      await expect(
        controller.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(error);
    });

    it('should handle ForbiddenException when user is not owner', async () => {
      const error = new Error('No tienes permiso para pagar esta reserva');
      paymentsService.createIntent.mockRejectedValue(error);

      await expect(
        controller.createIntent(createPaymentIntentDto, 'different-user-id'),
      ).rejects.toThrow(error);
    });

    it('should handle BadRequestException when booking expired', async () => {
      const error = new Error('La reserva ha expirado');
      paymentsService.createIntent.mockRejectedValue(error);

      await expect(
        controller.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(error);
    });

    it('should handle BadRequestException when booking already processed', async () => {
      const error = new Error('La reserva ya fue procesada con estado: confirmed');
      paymentsService.createIntent.mockRejectedValue(error);

      await expect(
        controller.createIntent(createPaymentIntentDto, 'user-uuid-123'),
      ).rejects.toThrow(error);
    });
  });

  describe('handleWebhook', () => {
    const mockSignature = 'test-stripe-signature';
    const mockRawBody = Buffer.from('test-raw-body');
    const mockRequest: any = {
      rawBody: mockRawBody,
    };

    const mockWebhookResponse = {
      received: true,
    };

    it('should handle webhook successfully', async () => {
      paymentsService.handleWebhook.mockResolvedValue(mockWebhookResponse);

      const result = await controller.handleWebhook(mockSignature, mockRequest);

      expect(result).toEqual(mockWebhookResponse);
      expect(paymentsService.handleWebhook).toHaveBeenCalledWith(mockSignature, mockRawBody);
    });

    it('should throw error when rawBody is missing', async () => {
      const requestWithoutRawBody: any = {
        rawBody: undefined,
      };

      await expect(
        controller.handleWebhook(mockSignature, requestWithoutRawBody),
      ).rejects.toThrow('Raw body is required for Stripe webhook validation');
    });

    it('should handle different signatures', async () => {
      const differentSignature = 'different-signature';
      paymentsService.handleWebhook.mockResolvedValue(mockWebhookResponse);

      await controller.handleWebhook(differentSignature, mockRequest);

      expect(paymentsService.handleWebhook).toHaveBeenCalledWith(differentSignature, mockRawBody);
    });

    it('should handle BadRequestException for invalid signature', async () => {
      const error = new Error('Signature inválida');
      paymentsService.handleWebhook.mockRejectedValue(error);

      await expect(controller.handleWebhook(mockSignature, mockRequest)).rejects.toThrow(error);
    });

    it('should handle BadRequestException for amount mismatch', async () => {
      const error = new Error('Amount mismatch');
      paymentsService.handleWebhook.mockRejectedValue(error);

      await expect(controller.handleWebhook(mockSignature, mockRequest)).rejects.toThrow(error);
    });

    it('should handle NotFoundException when booking not found', async () => {
      const error = new Error('Reserva no encontrada');
      paymentsService.handleWebhook.mockRejectedValue(error);

      await expect(controller.handleWebhook(mockSignature, mockRequest)).rejects.toThrow(error);
    });

    it('should pass raw body buffer correctly', async () => {
      const customRawBody = Buffer.from('custom-webhook-payload');
      const customRequest: any = {
        rawBody: customRawBody,
      };

      paymentsService.handleWebhook.mockResolvedValue(mockWebhookResponse);

      await controller.handleWebhook(mockSignature, customRequest);

      expect(paymentsService.handleWebhook).toHaveBeenCalledWith(mockSignature, customRawBody);
    });
  });
});
