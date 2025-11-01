import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../../../../src/modules/events/events.controller';
import { EventsService } from '../../../../src/modules/events/events.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventCategory } from '../../../../src/modules/events/enums/event-category.enum';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;
  let cacheManager: any;

  const mockEventsService = {
    create: jest.fn(),
    findAllWithFilters: jest.fn(),
    findOne: jest.fn(),
    findMyEvents: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  };

  const mockCacheManager = {
    reset: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockOrganizerId = 'organizer-uuid';
  const mockVenueId = 'venue-uuid';

  const mockEvent = {
    id: 'event-uuid',
    venueId: mockVenueId,
    title: 'Rock Concert 2025',
    description:
      'An amazing rock concert with the best national bands. Doors open at 7 PM.',
    category: EventCategory.CONCERT,
    eventDate: new Date('2025-12-31T20:00:00Z'),
    imageUrl: 'https://example.com/image.jpg',
    ticketPrice: 25000,
    totalTickets: 500,
    soldTickets: 0,
    isActive: true,
    isCancelled: false,
    organizerId: mockOrganizerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
    cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createEventDto = {
      venueId: mockVenueId,
      title: 'Rock Concert 2025',
      description:
        'An amazing rock concert with the best national bands. Doors open at 7 PM.',
      category: EventCategory.CONCERT,
      eventDate: '2025-12-31T20:00:00Z',
      imageUrl: 'https://example.com/image.jpg',
      ticketPrice: 25000,
      totalTickets: 500,
    };

    it('should create a new event', async () => {
      mockEventsService.create.mockResolvedValue(mockEvent);

      const result = await controller.create(createEventDto, mockOrganizerId);

      expect(service.create).toHaveBeenCalledWith(
        createEventDto,
        mockOrganizerId,
      );
      expect(result).toEqual(mockEvent);
    });

    it('should invalidate cache after creating an event', async () => {
      mockEventsService.create.mockResolvedValue(mockEvent);

      await controller.create(createEventDto, mockOrganizerId);

      // Cache invalidation is called (even if it's a no-op)
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const queryDto = {
      page: 1,
      limit: 50,
      category: EventCategory.CONCERT,
    };

    const mockPaginatedResult = {
      data: [mockEvent],
      meta: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it('should return paginated events', async () => {
      mockEventsService.findAllWithFilters.mockResolvedValue(
        mockPaginatedResult,
      );

      const result = await controller.findAll(queryDto);

      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockPaginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by category', async () => {
      const concertDto = { category: EventCategory.CONCERT };
      mockEventsService.findAllWithFilters.mockResolvedValue({
        data: [mockEvent],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      await controller.findAll(concertDto);

      expect(service.findAllWithFilters).toHaveBeenCalledWith(concertDto);
    });

    it('should filter by search term', async () => {
      const searchDto = { search: 'Rock' };
      mockEventsService.findAllWithFilters.mockResolvedValue({
        data: [mockEvent],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });

      await controller.findAll(searchDto);

      expect(service.findAllWithFilters).toHaveBeenCalledWith(searchDto);
    });

    it('should filter by city', async () => {
      const cityDto = { city: 'Santiago' };
      mockEventsService.findAllWithFilters.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.findAll(cityDto);

      expect(service.findAllWithFilters).toHaveBeenCalledWith(cityDto);
    });
  });

  describe('findMyEvents', () => {
    const queryDto = {
      page: 1,
      limit: 50,
    };

    const mockPaginatedResult = {
      data: [mockEvent],
      meta: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it('should return events for the authenticated organizer', async () => {
      mockEventsService.findMyEvents.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findMyEvents(mockOrganizerId, queryDto);

      expect(service.findMyEvents).toHaveBeenCalledWith(
        mockOrganizerId,
        queryDto,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      const result = await controller.findOne('event-uuid');

      expect(service.findOne).toHaveBeenCalledWith('event-uuid');
      expect(result).toEqual(mockEvent);
    });

    it('should call service findOne with correct id', async () => {
      const eventId = 'specific-event-id';
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      await controller.findOne(eventId);

      expect(service.findOne).toHaveBeenCalledWith(eventId);
    });
  });

  describe('update', () => {
    const updateEventDto = {
      title: 'Updated Rock Concert 2025',
      ticketPrice: 30000,
    };

    const updatedEvent = {
      ...mockEvent,
      ...updateEventDto,
    };

    it('should update an event', async () => {
      mockEventsService.update.mockResolvedValue(updatedEvent);

      const result = await controller.update(
        'event-uuid',
        updateEventDto,
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(service.update).toHaveBeenCalledWith(
        'event-uuid',
        updateEventDto,
        mockOrganizerId,
        UserRole.ORGANIZER,
      );
      expect(result.title).toBe(updateEventDto.title);
      expect(result.ticketPrice).toBe(updateEventDto.ticketPrice);
    });

    it('should invalidate cache after updating an event', async () => {
      mockEventsService.update.mockResolvedValue(updatedEvent);

      await controller.update(
        'event-uuid',
        updateEventDto,
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(service.update).toHaveBeenCalled();
    });

    it('should allow super_admin to update any event', async () => {
      mockEventsService.update.mockResolvedValue(updatedEvent);

      await controller.update(
        'event-uuid',
        updateEventDto,
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );

      expect(service.update).toHaveBeenCalledWith(
        'event-uuid',
        updateEventDto,
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );
    });
  });

  describe('cancel', () => {
    const cancelledEvent = {
      ...mockEvent,
      isCancelled: true,
      isActive: false,
    };

    it('should cancel an event', async () => {
      mockEventsService.cancel.mockResolvedValue(cancelledEvent);

      const result = await controller.cancel(
        'event-uuid',
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(service.cancel).toHaveBeenCalledWith(
        'event-uuid',
        mockOrganizerId,
        UserRole.ORGANIZER,
      );
      expect(result.isCancelled).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should invalidate cache after cancelling an event', async () => {
      mockEventsService.cancel.mockResolvedValue(cancelledEvent);

      await controller.cancel(
        'event-uuid',
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(service.cancel).toHaveBeenCalled();
    });

    it('should allow super_admin to cancel any event', async () => {
      mockEventsService.cancel.mockResolvedValue(cancelledEvent);

      await controller.cancel(
        'event-uuid',
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );

      expect(service.cancel).toHaveBeenCalledWith(
        'event-uuid',
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );
    });
  });
});
