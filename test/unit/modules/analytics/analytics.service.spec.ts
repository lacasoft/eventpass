import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from '../../../../src/modules/analytics/analytics.service';
import { Event } from '../../../../src/modules/events/entities/event.entity';
import { Booking } from '../../../../src/modules/bookings/entities/booking.entity';
import { Payment } from '../../../../src/modules/payments/entities/payment.entity';
import { User } from '../../../../src/modules/users/entities/user.entity';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';
import { BookingStatus } from '../../../../src/modules/bookings/enums/booking-status.enum';
import { PaymentStatus } from '../../../../src/modules/payments/enums/payment-status.enum';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockEventRepository: any;
  let mockBookingRepository: any;
  let mockPaymentRepository: any;
  let mockUserRepository: any;

  const mockEvent = {
    id: 'event-uuid-123',
    title: 'Test Event',
    organizerId: 'organizer-uuid-123',
    totalTickets: 100,
    soldTickets: 10,
    availableTickets: 90,
    isActive: true,
    isCancelled: false,
    eventDate: new Date(Date.now() + 86400000), // Mañana
    organizer: {
      id: 'organizer-uuid-123',
      firstName: 'John',
      lastName: 'Organizer',
    },
  };

  const mockBooking = {
    id: 'booking-uuid-123',
    userId: 'user-uuid-123',
    eventId: 'event-uuid-123',
    quantity: 2,
    total: 115,
    serviceFee: 15,
    status: BookingStatus.CONFIRMED,
    createdAt: new Date('2025-01-15'),
  };

  const mockPayment = {
    id: 'payment-uuid-123',
    bookingId: 'booking-uuid-123',
    status: PaymentStatus.SUCCEEDED,
  };

  beforeEach(async () => {
    mockEventRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    mockBookingRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    mockPaymentRepository = {
      find: jest.fn(),
    };

    mockUserRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganizerDashboard', () => {
    it('should return empty dashboard when organizer has no events', async () => {
      mockEventRepository.find.mockResolvedValue([]);

      const result = await service.getOrganizerDashboard('organizer-uuid-123');

      expect(result.summary.totalEvents).toBe(0);
      expect(result.summary.activeEvents).toBe(0);
      expect(result.summary.totalTicketsSold).toBe(0);
      expect(result.summary.grossRevenue).toBe(0);
      expect(result.summary.netRevenue).toBe(0);
      expect(result.summary.platformFees).toBe(0);
      expect(result.events).toEqual([]);
    });

    it('should return dashboard with event data', async () => {
      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getOrganizerDashboard('organizer-uuid-123');

      expect(result.summary.totalEvents).toBe(1);
      expect(result.summary.activeEvents).toBe(1);
      expect(result.summary.totalTicketsSold).toBe(10);
      expect(result.summary.grossRevenue).toBe(115);
      expect(result.summary.netRevenue).toBe(100);
      expect(result.summary.platformFees).toBe(15);
      expect(result.events).toHaveLength(1);
    });

    it('should calculate occupancy rate correctly', async () => {
      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getOrganizerDashboard('organizer-uuid-123');

      const eventData = result.events[0];
      expect(eventData.occupancyRate).toBe(10); // 10 sold / 100 total = 10%
    });

    it('should only count confirmed bookings with successful payments', async () => {
      const pendingBooking = { ...mockBooking, id: 'booking-2', status: BookingStatus.PENDING };
      const failedPayment = { ...mockPayment, bookingId: 'booking-2', status: PaymentStatus.FAILED };

      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find.mockResolvedValue([mockBooking, pendingBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment, failedPayment]);

      const result = await service.getOrganizerDashboard('organizer-uuid-123');

      // Solo debe contar mockBooking
      expect(result.summary.grossRevenue).toBe(115);
    });

    it('should mark cancelled events as cancelled', async () => {
      const cancelledEvent = { ...mockEvent, isCancelled: true };
      mockEventRepository.find.mockResolvedValue([cancelledEvent]);
      mockBookingRepository.find.mockResolvedValue([]);
      mockPaymentRepository.find.mockResolvedValue([]);

      const result = await service.getOrganizerDashboard('organizer-uuid-123');

      expect(result.events[0].status).toBe('cancelled');
    });
  });

  describe('getEventStats', () => {
    it('should throw NotFoundException if event not found', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getEventStats('non-existent-id', 'user-id', UserRole.ORGANIZER),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getEventStats('non-existent-id', 'user-id', UserRole.ORGANIZER),
      ).rejects.toThrow('Evento no encontrado');
    });

    it('should throw ForbiddenException if user is not owner and not admin', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      await expect(
        service.getEventStats('event-uuid-123', 'different-user-id', UserRole.ORGANIZER),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getEventStats('event-uuid-123', 'different-user-id', UserRole.ORGANIZER),
      ).rejects.toThrow('No tienes permiso para ver las estadísticas de este evento');
    });

    it('should allow admin to view any event stats', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getEventStats(
        'event-uuid-123',
        'different-user-id',
        UserRole.ADMIN,
      );

      expect(result.event.id).toBe('event-uuid-123');
    });

    it('should return complete event statistics', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getEventStats(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );

      expect(result.event.id).toBe('event-uuid-123');
      expect(result.stats.totalTickets).toBe(100);
      expect(result.stats.soldTickets).toBe(2);
      expect(result.stats.availableTickets).toBe(90);
      expect(result.stats.grossRevenue).toBe(115);
      expect(result.stats.serviceFees).toBe(15);
      expect(result.stats.netRevenue).toBe(100);
      expect(result.stats.totalBookings).toBe(1);
    });

    it('should calculate average ticket price correctly', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getEventStats(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );

      // 115 total / 2 tickets = 57.5 per ticket
      expect(result.stats.averageTicketPrice).toBe(57.5);
    });

    it('should return sales over time data', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockBookingRepository.find.mockResolvedValue([mockBooking]);
      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getEventStats(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );

      expect(result.salesOverTime).toBeDefined();
      expect(Array.isArray(result.salesOverTime)).toBe(true);
      if (result.salesOverTime.length > 0) {
        expect(result.salesOverTime[0]).toHaveProperty('date');
        expect(result.salesOverTime[0]).toHaveProperty('ticketsSold');
        expect(result.salesOverTime[0]).toHaveProperty('revenue');
      }
    });

    it('should handle event with no bookings', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockBookingRepository.find.mockResolvedValue([]);
      mockPaymentRepository.find.mockResolvedValue([]);

      const result = await service.getEventStats(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );

      expect(result.stats.totalBookings).toBe(0);
      expect(result.stats.soldTickets).toBe(0);
      expect(result.stats.grossRevenue).toBe(0);
      expect(result.stats.averageTicketPrice).toBe(0);
    });
  });

  describe('getAdminDashboard', () => {
    it('should return complete admin dashboard', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(80)  // customers
        .mockResolvedValueOnce(15)  // organizers
        .mockResolvedValueOnce(5);  // admins

      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find
        .mockResolvedValueOnce([mockBooking]) // For revenue calculation
        .mockResolvedValueOnce([mockBooking]); // For recent activity

      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getAdminDashboard();

      expect(result.summary.totalUsers).toBe(100);
      expect(result.summary.totalCustomers).toBe(80);
      expect(result.summary.totalOrganizers).toBe(15);
      expect(result.summary.totalAdmins).toBe(5);
      expect(result.summary.totalEvents).toBe(1);
      expect(result.summary.activeEvents).toBe(1);
    });

    it('should calculate platform revenue correctly', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);

      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find
        .mockResolvedValueOnce([mockBooking])
        .mockResolvedValueOnce([mockBooking]);

      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getAdminDashboard();

      expect(result.summary.grossRevenue).toBe(115);
      expect(result.summary.platformRevenue).toBe(15); // Service fees
    });

    it('should return top 5 events by revenue', async () => {
      const events = Array(10).fill(null).map((_, i) => ({
        ...mockEvent,
        id: `event-${i}`,
        title: `Event ${i}`,
      }));

      mockUserRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);

      mockEventRepository.find.mockResolvedValue(events);
      mockBookingRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPaymentRepository.find.mockResolvedValue([]);

      const result = await service.getAdminDashboard();

      expect(result.topEvents).toHaveLength(5);
    });

    it('should return top 5 organizers by revenue', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);

      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find
        .mockResolvedValueOnce([mockBooking])
        .mockResolvedValueOnce([mockBooking]);

      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getAdminDashboard();

      expect(result.topOrganizers).toBeDefined();
      expect(Array.isArray(result.topOrganizers)).toBe(true);
    });

    it('should return recent activity', async () => {
      const bookingWithRelations = {
        ...mockBooking,
        event: { id: 'event-1', title: 'Test Event' },
        user: { id: 'user-1', firstName: 'John' },
      };

      mockUserRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(5);

      mockEventRepository.find.mockResolvedValue([mockEvent]);
      mockBookingRepository.find
        .mockResolvedValueOnce([mockBooking])
        .mockResolvedValueOnce([bookingWithRelations]);

      mockPaymentRepository.find.mockResolvedValue([mockPayment]);

      const result = await service.getAdminDashboard();

      expect(result.recentActivity).toBeDefined();
      expect(Array.isArray(result.recentActivity)).toBe(true);
      if (result.recentActivity.length > 0) {
        expect(result.recentActivity[0]).toHaveProperty('type');
        expect(result.recentActivity[0]).toHaveProperty('description');
        expect(result.recentActivity[0]).toHaveProperty('timestamp');
      }
    });

    it('should handle empty database', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockEventRepository.find.mockResolvedValue([]);
      mockBookingRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPaymentRepository.find.mockResolvedValue([]);

      const result = await service.getAdminDashboard();

      expect(result.summary.totalUsers).toBe(0);
      expect(result.summary.totalEvents).toBe(0);
      expect(result.summary.grossRevenue).toBe(0);
      expect(result.topEvents).toEqual([]);
      expect(result.topOrganizers).toEqual([]);
      expect(result.recentActivity).toEqual([]);
    });
  });
});
