import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingsService } from '../../../../src/modules/bookings/bookings.service';
import { Booking } from '../../../../src/modules/bookings/entities/booking.entity';
import { Ticket } from '../../../../src/modules/bookings/entities/ticket.entity';
import { Event } from '../../../../src/modules/events/entities/event.entity';
import { Payment } from '../../../../src/modules/payments/entities/payment.entity';
import { RedisLockService } from '../../../../src/common/redis/redis-lock.service';
import { JobsService } from '../../../../src/modules/jobs/jobs.service';
import { BookingStatus } from '../../../../src/modules/bookings/enums/booking-status.enum';
import { TicketStatus } from '../../../../src/modules/bookings/enums/ticket-status.enum';
import { DataSource, QueryRunner } from 'typeorm';

describe('BookingsService', () => {
  let service: BookingsService;
  let mockQueryRunner: any;
  let mockDataSource: any;
  let mockRedisLockService: any;
  let mockJobsService: any;

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
    stripePaymentIntentId: null,
    stripeClientSecret: null,
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    expiresAt: new Date(Date.now() + 600000), // 10 minutos en el futuro
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent = {
    id: 'event-uuid-123',
    title: 'Test Event',
    ticketPrice: 50,
    totalTickets: 100,
    soldTickets: 0,
    availableTickets: 100,
    isActive: true,
    isCancelled: false,
    eventDate: new Date(Date.now() + 86400000), // Mañana
    venue: {
      id: 'venue-uuid-123',
      name: 'Test Venue',
      address: 'Test Address',
      city: 'Test City',
    },
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
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockEvent),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockReturnValue(mockBooking),
        save: jest.fn().mockResolvedValue(mockBooking),
        findOne: jest.fn().mockResolvedValue(mockBooking),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockRedisLockService = {
      withLock: jest.fn((key, callback) => callback()),
    };

    mockJobsService = {
      scheduleBookingExpiration: jest.fn().mockResolvedValue(undefined),
      cancelBookingExpiration: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RedisLockService,
          useValue: mockRedisLockService,
        },
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserve', () => {
    const createBookingDto = {
      eventId: 'event-uuid-123',
      quantity: 2,
    };

    it('should create a booking reservation successfully', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue({
        ...mockBooking,
        event: mockEvent,
      });

      const result = await service.reserve(createBookingDto, 'user-uuid-123');

      expect(mockRedisLockService.withLock).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith('SERIALIZABLE');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockJobsService.scheduleBookingExpiration).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if event not found', async () => {
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        'Evento no encontrado',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if event is not available', async () => {
      const inactiveEvent = { ...mockEvent, isActive: false };
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(inactiveEvent),
      });

      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        'El evento no está disponible para reservas',
      );
    });

    it('should throw BadRequestException if event date is in the past', async () => {
      const pastEvent = { ...mockEvent, eventDate: new Date(Date.now() - 86400000) };
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(pastEvent),
      });

      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        'El evento ya finalizó',
      );
    });

    it('should throw BadRequestException if not enough tickets available', async () => {
      const lowTicketsEvent = { ...mockEvent, availableTickets: 1 };
      mockQueryRunner.manager.createQueryBuilder = jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(lowTicketsEvent),
      });

      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reserve(createBookingDto, 'user-uuid-123')).rejects.toThrow(
        /No hay suficientes boletos disponibles/,
      );
    });

    it('should calculate prices correctly with 15% service fee', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue({
        ...mockBooking,
        event: mockEvent,
      });

      await service.reserve(createBookingDto, 'user-uuid-123');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Booking,
        expect.objectContaining({
          unitPrice: 50,
          subtotal: 100,
          serviceFee: 15,
          total: 115,
          quantity: 2,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return booking details for owner', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue({
        ...mockBooking,
        event: mockEvent,
        tickets: [],
      });

      const result = await service.findOne('booking-uuid-123', 'user-uuid-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-uuid-123');
      expect(result.quantity).toBe(2);
    });

    it('should throw NotFoundException if booking not found', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', 'user-uuid-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue({
        ...mockBooking,
        userId: 'different-user-id',
        event: mockEvent,
        tickets: [],
      });

      await expect(service.findOne('booking-uuid-123', 'user-uuid-123')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne('booking-uuid-123', 'user-uuid-123')).rejects.toThrow(
        'No tienes permiso para ver esta reserva',
      );
    });

    it('should allow admin to view any booking', async () => {
      const bookingRepo = service['bookingRepository'];
      bookingRepo.findOne = jest.fn().mockResolvedValue({
        ...mockBooking,
        userId: 'different-user-id',
        event: mockEvent,
        tickets: [],
      });

      const result = await service.findOne('booking-uuid-123', 'admin-user-id', 'admin');

      expect(result).toBeDefined();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending booking and release tickets', async () => {
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(mockBooking);
      mockQueryRunner.manager.save = jest.fn().mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const result = await service.cancel('booking-uuid-123', 'user-uuid-123', 'Test reason');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockQueryRunner.manager.update).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.cancel('non-existent-id', 'user-uuid-123'),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(confirmedBooking);

      await expect(
        service.cancel('booking-uuid-123', 'user-uuid-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancel('booking-uuid-123', 'user-uuid-123'),
      ).rejects.toThrow('Solo se pueden cancelar reservas pendientes');
    });
  });

  describe('confirm', () => {
    it('should confirm booking and generate tickets', async () => {
      const pendingBooking = {
        ...mockBooking,
        status: BookingStatus.PENDING,
        user: { id: 'user-uuid-123' },
        event: mockEvent,
      };

      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(pendingBooking);

      const mockTickets = [
        { id: 'ticket-1', ticketCode: 'TKT-2025-ABC123', status: TicketStatus.VALID },
        { id: 'ticket-2', ticketCode: 'TKT-2025-DEF456', status: TicketStatus.VALID },
      ];

      mockQueryRunner.manager.save = jest
        .fn()
        .mockImplementation((entity, data) => {
          if (entity === Booking) {
            return Promise.resolve({ ...pendingBooking, status: BookingStatus.CONFIRMED });
          }
          return Promise.resolve(mockTickets);
        });

      const result = await service.confirm('booking-uuid-123', 'pi_stripe_123');

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.paymentStatus).toBe('succeeded');
      expect(result.tickets).toHaveLength(2);
      expect(mockJobsService.cancelBookingExpiration).toHaveBeenCalledWith('booking-uuid-123');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.confirm('non-existent-id', 'pi_stripe_123'),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(confirmedBooking);

      await expect(
        service.confirm('booking-uuid-123', 'pi_stripe_123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirm('booking-uuid-123', 'pi_stripe_123'),
      ).rejects.toThrow(/La reserva ya fue procesada/);
    });

    it('should throw BadRequestException if booking has expired', async () => {
      const expiredBooking = {
        ...mockBooking,
        status: BookingStatus.PENDING, // Debe ser pending para pasar la primera validación
        expiresAt: new Date(Date.now() - 1000), // Expirado hace 1 segundo
      };
      mockQueryRunner.manager.findOne = jest.fn().mockResolvedValue(expiredBooking);

      await expect(
        service.confirm('booking-uuid-123', 'pi_stripe_123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirm('booking-uuid-123', 'pi_stripe_123'),
      ).rejects.toThrow('La reserva ha expirado');
    });
  });
});
