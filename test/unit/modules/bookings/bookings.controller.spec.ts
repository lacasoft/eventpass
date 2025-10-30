import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from '../../../../src/modules/bookings/bookings.controller';
import { BookingsService } from '../../../../src/modules/bookings/bookings.service';
import { CreateBookingDto } from '../../../../src/modules/bookings/dto/create-booking.dto';
import { MyBookingsQueryDto } from '../../../../src/modules/bookings/dto/my-bookings-query.dto';
import { BookingStatus } from '../../../../src/modules/bookings/enums/booking-status.enum';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: jest.Mocked<BookingsService>;

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
    expiresAt: new Date(Date.now() + 600000),
    createdAt: new Date(),
    updatedAt: new Date(),
    event: {
      id: 'event-uuid-123',
      title: 'Test Event',
      eventDate: new Date(Date.now() + 86400000),
      venue: {
        id: 'venue-uuid-123',
        name: 'Test Venue',
        address: 'Test Address',
        city: 'Test City',
      },
    },
  };

  const mockBookingDetail = {
    id: 'booking-uuid-123',
    event: mockBooking.event,
    quantity: 2,
    unitPrice: 50,
    subtotal: 100,
    serviceFee: 15,
    total: 115,
    status: BookingStatus.CONFIRMED,
    paymentStatus: 'succeeded',
    tickets: [
      { id: 'ticket-1', ticketCode: 'TKT-2025-ABC123', status: 'valid' },
      { id: 'ticket-2', ticketCode: 'TKT-2025-DEF456', status: 'valid' },
    ],
    createdAt: new Date(),
    confirmedAt: new Date(),
  };

  const mockBookingsService = {
    reserve: jest.fn(),
    findOne: jest.fn(),
    findByUser: jest.fn(),
    confirm: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    bookingsService = module.get(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reserve', () => {
    const createBookingDto: CreateBookingDto = {
      eventId: 'event-uuid-123',
      quantity: 2,
    };

    it('should create a booking reservation', async () => {
      bookingsService.reserve.mockResolvedValue(mockBooking as any);

      const result = await controller.reserve(createBookingDto, 'user-uuid-123');

      expect(result).toEqual(mockBooking);
      expect(bookingsService.reserve).toHaveBeenCalledWith(createBookingDto, 'user-uuid-123');
    });

    it('should pass userId from decorator to service', async () => {
      bookingsService.reserve.mockResolvedValue(mockBooking as any);

      await controller.reserve(createBookingDto, 'user-uuid-456');

      expect(bookingsService.reserve).toHaveBeenCalledWith(createBookingDto, 'user-uuid-456');
    });

    it('should handle service errors', async () => {
      const error = new Error('No hay suficientes boletos disponibles');
      bookingsService.reserve.mockRejectedValue(error);

      await expect(controller.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return booking detail for owner', async () => {
      bookingsService.findOne.mockResolvedValue(mockBookingDetail as any);

      const result = await controller.findOne('booking-uuid-123', 'user-uuid-123', UserRole.CLIENTE);

      expect(result).toEqual(mockBookingDetail);
      expect(bookingsService.findOne).toHaveBeenCalledWith(
        'booking-uuid-123',
        'user-uuid-123',
        UserRole.CLIENTE,
      );
    });

    it('should pass userRole to service', async () => {
      bookingsService.findOne.mockResolvedValue(mockBookingDetail as any);

      await controller.findOne('booking-uuid-123', 'admin-uuid-123', UserRole.ADMIN);

      expect(bookingsService.findOne).toHaveBeenCalledWith(
        'booking-uuid-123',
        'admin-uuid-123',
        UserRole.ADMIN,
      );
    });

    it('should handle NotFoundException from service', async () => {
      const error = new Error('Reserva no encontrada');
      bookingsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne('non-existent-id', 'user-uuid-123', UserRole.CLIENTE),
      ).rejects.toThrow(error);
    });

    it('should handle ForbiddenException from service', async () => {
      const error = new Error('No tienes permiso para ver esta reserva');
      bookingsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne('booking-uuid-123', 'different-user-id', UserRole.CLIENTE),
      ).rejects.toThrow(error);
    });
  });

  describe('findMyBookings', () => {
    const mockQuery: MyBookingsQueryDto = {
      page: 1,
      limit: 20,
    };

    const mockPaginatedResponse = {
      data: [mockBookingDetail],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated bookings', async () => {
      bookingsService.findByUser.mockResolvedValue(mockPaginatedResponse as any);

      const result = await controller.findMyBookings('user-uuid-123', mockQuery);

      expect(result).toEqual(mockPaginatedResponse);
      expect(bookingsService.findByUser).toHaveBeenCalledWith('user-uuid-123', mockQuery);
    });

    it('should handle empty query params', async () => {
      bookingsService.findByUser.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      } as any);

      const result = await controller.findMyBookings('user-uuid-123', {});

      expect(result.data).toEqual([]);
      expect(bookingsService.findByUser).toHaveBeenCalledWith('user-uuid-123', {});
    });

    it('should pass status filter to service', async () => {
      const queryWithStatus: MyBookingsQueryDto = {
        page: 1,
        limit: 20,
        status: BookingStatus.CONFIRMED,
      };

      bookingsService.findByUser.mockResolvedValue(mockPaginatedResponse as any);

      await controller.findMyBookings('user-uuid-123', queryWithStatus);

      expect(bookingsService.findByUser).toHaveBeenCalledWith('user-uuid-123', queryWithStatus);
    });

    it('should handle different page sizes', async () => {
      const customQuery: MyBookingsQueryDto = {
        page: 2,
        limit: 50,
      };

      bookingsService.findByUser.mockResolvedValue({
        data: [],
        meta: { page: 2, limit: 50, total: 100, totalPages: 2 },
      } as any);

      await controller.findMyBookings('user-uuid-123', customQuery);

      expect(bookingsService.findByUser).toHaveBeenCalledWith('user-uuid-123', customQuery);
    });
  });

  describe('confirm', () => {
    const mockConfirmResponse = {
      id: 'booking-uuid-123',
      status: BookingStatus.CONFIRMED,
      paymentStatus: 'succeeded',
      confirmedAt: new Date(),
      tickets: [
        { id: 'ticket-1', ticketCode: 'TKT-2025-ABC123', status: 'valid' },
        { id: 'ticket-2', ticketCode: 'TKT-2025-DEF456', status: 'valid' },
      ],
    };

    it('should confirm booking with payment intent id', async () => {
      bookingsService.confirm.mockResolvedValue(mockConfirmResponse as any);

      const result = await controller.confirm('booking-uuid-123', 'pi_stripe_123');

      expect(result).toEqual(mockConfirmResponse);
      expect(bookingsService.confirm).toHaveBeenCalledWith('booking-uuid-123', 'pi_stripe_123');
    });

    it('should handle confirmation of different bookings', async () => {
      bookingsService.confirm.mockResolvedValue(mockConfirmResponse as any);

      await controller.confirm('booking-uuid-456', 'pi_stripe_456');

      expect(bookingsService.confirm).toHaveBeenCalledWith('booking-uuid-456', 'pi_stripe_456');
    });

    it('should handle BadRequestException when booking already processed', async () => {
      const error = new Error('La reserva ya fue procesada con estado: confirmed');
      bookingsService.confirm.mockRejectedValue(error);

      await expect(controller.confirm('booking-uuid-123', 'pi_stripe_123')).rejects.toThrow(error);
    });

    it('should handle BadRequestException when booking expired', async () => {
      const error = new Error('La reserva ha expirado');
      bookingsService.confirm.mockRejectedValue(error);

      await expect(controller.confirm('booking-uuid-123', 'pi_stripe_123')).rejects.toThrow(error);
    });

    it('should handle NotFoundException when booking not found', async () => {
      const error = new Error('Reserva no encontrada');
      bookingsService.confirm.mockRejectedValue(error);

      await expect(
        controller.confirm('non-existent-id', 'pi_stripe_123'),
      ).rejects.toThrow(error);
    });
  });
});
