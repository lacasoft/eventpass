import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../../../../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../../../../src/modules/analytics/analytics.service';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockOrganizerDashboard = {
    summary: {
      totalEvents: 5,
      activeEvents: 3,
      totalTicketsSold: 150,
      grossRevenue: 17250,
      netRevenue: 15000,
      platformFees: 2250,
    },
    events: [
      {
        id: 'event-1',
        title: 'Event 1',
        eventDate: new Date('2025-12-31'),
        totalTickets: 100,
        soldTickets: 50,
        availableTickets: 50,
        occupancyRate: 50.0,
        revenue: 5750,
        status: 'published',
      },
    ],
  };

  const mockEventStats = {
    event: {
      id: 'event-1',
      title: 'Test Event',
      eventDate: new Date('2025-12-31'),
    },
    stats: {
      totalTickets: 100,
      soldTickets: 50,
      availableTickets: 50,
      occupancyRate: 50.0,
      grossRevenue: 5750,
      serviceFees: 862.5,
      netRevenue: 4887.5,
      averageTicketPrice: 115,
      totalBookings: 25,
      averageTicketsPerBooking: 2.0,
    },
    salesOverTime: [
      {
        date: '2025-01-15',
        ticketsSold: 20,
        revenue: 2300,
      },
    ],
  };

  const mockAdminDashboard = {
    summary: {
      totalUsers: 1000,
      totalCustomers: 850,
      totalOrganizers: 140,
      totalAdmins: 10,
      totalEvents: 250,
      activeEvents: 180,
      totalTicketsSold: 5000,
      grossRevenue: 575000,
      platformRevenue: 86250,
    },
    topEvents: [
      {
        id: 'event-1',
        title: 'Popular Event',
        soldTickets: 500,
        revenue: 57500,
      },
    ],
    topOrganizers: [
      {
        id: 'organizer-1',
        name: 'John Doe',
        totalEvents: 20,
        totalRevenue: 115000,
      },
    ],
    recentActivity: [
      {
        type: 'booking',
        description: 'User compró 2 tickets para Event',
        timestamp: new Date('2025-01-28'),
      },
    ],
  };

  const mockAnalyticsService = {
    getOrganizerDashboard: jest.fn(),
    getEventStats: jest.fn(),
    getAdminDashboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrganizerDashboard', () => {
    it('should return organizer dashboard', async () => {
      analyticsService.getOrganizerDashboard.mockResolvedValue(mockOrganizerDashboard as any);

      const result = await controller.getOrganizerDashboard('organizer-uuid-123');

      expect(result).toEqual(mockOrganizerDashboard);
      expect(analyticsService.getOrganizerDashboard).toHaveBeenCalledWith('organizer-uuid-123');
    });

    it('should pass userId from decorator to service', async () => {
      analyticsService.getOrganizerDashboard.mockResolvedValue(mockOrganizerDashboard as any);

      await controller.getOrganizerDashboard('organizer-uuid-456');

      expect(analyticsService.getOrganizerDashboard).toHaveBeenCalledWith('organizer-uuid-456');
    });

    it('should return empty dashboard when organizer has no events', async () => {
      const emptyDashboard = {
        summary: {
          totalEvents: 0,
          activeEvents: 0,
          totalTicketsSold: 0,
          grossRevenue: 0,
          netRevenue: 0,
          platformFees: 0,
        },
        events: [],
      };

      analyticsService.getOrganizerDashboard.mockResolvedValue(emptyDashboard as any);

      const result = await controller.getOrganizerDashboard('new-organizer-uuid');

      expect(result).toEqual(emptyDashboard);
      expect(result.events).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      analyticsService.getOrganizerDashboard.mockRejectedValue(error);

      await expect(controller.getOrganizerDashboard('organizer-uuid-123')).rejects.toThrow(error);
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics for owner', async () => {
      analyticsService.getEventStats.mockResolvedValue(mockEventStats as any);

      const result = await controller.getEventStats(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );

      expect(result).toEqual(mockEventStats);
      expect(analyticsService.getEventStats).toHaveBeenCalledWith(
        'event-uuid-123',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );
    });

    it('should allow admin to view any event stats', async () => {
      analyticsService.getEventStats.mockResolvedValue(mockEventStats as any);

      const result = await controller.getEventStats(
        'event-uuid-123',
        'admin-uuid-123',
        UserRole.ADMIN,
      );

      expect(result).toEqual(mockEventStats);
      expect(analyticsService.getEventStats).toHaveBeenCalledWith(
        'event-uuid-123',
        'admin-uuid-123',
        UserRole.ADMIN,
      );
    });

    it('should allow super_admin to view any event stats', async () => {
      analyticsService.getEventStats.mockResolvedValue(mockEventStats as any);

      await controller.getEventStats('event-uuid-123', 'super-admin-uuid', UserRole.SUPER_ADMIN);

      expect(analyticsService.getEventStats).toHaveBeenCalledWith(
        'event-uuid-123',
        'super-admin-uuid',
        UserRole.SUPER_ADMIN,
      );
    });

    it('should handle NotFoundException from service', async () => {
      const error = new Error('Evento no encontrado');
      analyticsService.getEventStats.mockRejectedValue(error);

      await expect(
        controller.getEventStats('non-existent-id', 'organizer-uuid-123', UserRole.ORGANIZER),
      ).rejects.toThrow(error);
    });

    it('should handle ForbiddenException when user is not owner', async () => {
      const error = new Error('No tienes permiso para ver las estadísticas de este evento');
      analyticsService.getEventStats.mockRejectedValue(error);

      await expect(
        controller.getEventStats('event-uuid-123', 'different-user-id', UserRole.ORGANIZER),
      ).rejects.toThrow(error);
    });

    it('should pass different event IDs correctly', async () => {
      analyticsService.getEventStats.mockResolvedValue(mockEventStats as any);

      await controller.getEventStats('event-uuid-789', 'organizer-uuid-123', UserRole.ORGANIZER);

      expect(analyticsService.getEventStats).toHaveBeenCalledWith(
        'event-uuid-789',
        'organizer-uuid-123',
        UserRole.ORGANIZER,
      );
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard', async () => {
      analyticsService.getAdminDashboard.mockResolvedValue(mockAdminDashboard as any);

      const result = await controller.getAdminDashboard();

      expect(result).toEqual(mockAdminDashboard);
      expect(analyticsService.getAdminDashboard).toHaveBeenCalled();
    });

    it('should return complete dashboard with all sections', async () => {
      analyticsService.getAdminDashboard.mockResolvedValue(mockAdminDashboard as any);

      const result = await controller.getAdminDashboard();

      expect(result.summary).toBeDefined();
      expect(result.topEvents).toBeDefined();
      expect(result.topOrganizers).toBeDefined();
      expect(result.recentActivity).toBeDefined();
    });

    it('should return empty dashboard when no data', async () => {
      const emptyDashboard = {
        summary: {
          totalUsers: 0,
          totalCustomers: 0,
          totalOrganizers: 0,
          totalAdmins: 0,
          totalEvents: 0,
          activeEvents: 0,
          totalTicketsSold: 0,
          grossRevenue: 0,
          platformRevenue: 0,
        },
        topEvents: [],
        topOrganizers: [],
        recentActivity: [],
      };

      analyticsService.getAdminDashboard.mockResolvedValue(emptyDashboard as any);

      const result = await controller.getAdminDashboard();

      expect(result.summary.totalUsers).toBe(0);
      expect(result.topEvents).toHaveLength(0);
      expect(result.topOrganizers).toHaveLength(0);
      expect(result.recentActivity).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      analyticsService.getAdminDashboard.mockRejectedValue(error);

      await expect(controller.getAdminDashboard()).rejects.toThrow(error);
    });

    it('should be called without parameters', async () => {
      analyticsService.getAdminDashboard.mockResolvedValue(mockAdminDashboard as any);

      await controller.getAdminDashboard();

      expect(analyticsService.getAdminDashboard).toHaveBeenCalledWith();
      expect(analyticsService.getAdminDashboard).toHaveBeenCalledTimes(1);
    });
  });
});
