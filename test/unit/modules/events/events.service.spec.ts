import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../../../../src/modules/events/events.service';
import { Event } from '../../../../src/modules/events/entities/event.entity';
import { Venue } from '../../../../src/modules/venues/entities/venue.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventCategory } from '../../../../src/modules/events/enums/event-category.enum';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: Repository<Event>;
  let venueRepository: Repository<Venue>;

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVenueRepository = {
    findOne: jest.fn(),
  };

  const mockVenue = {
    id: 'venue-uuid',
    name: 'Test Venue',
    address: 'Test Address 123',
    city: 'Santiago',
    country: 'CL',
    capacity: 1000,
  };

  const mockOrganizerId = 'organizer-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Venue),
          useValue: mockVenueRepository,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    venueRepository = module.get<Repository<Venue>>(
      getRepositoryToken(Venue),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEventDto = {
      venueId: 'venue-uuid',
      title: 'Rock Concert 2025',
      description:
        'An amazing rock concert with the best national bands. Doors open at 7 PM.',
      category: EventCategory.CONCERT,
      eventDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      imageUrl: 'https://example.com/image.jpg',
      ticketPrice: 25000,
      totalTickets: 500,
    };

    it('should create an event successfully', async () => {
      const mockEvent = {
        id: 'event-uuid',
        ...createEventDto,
        eventDate: new Date(createEventDto.eventDate),
        organizerId: mockOrganizerId,
        soldTickets: 0,
        isActive: true,
        isCancelled: false,
      };

      mockVenueRepository.findOne.mockResolvedValue(mockVenue);
      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.create(createEventDto, mockOrganizerId);

      expect(venueRepository.findOne).toHaveBeenCalledWith({
        where: { id: createEventDto.venueId },
      });
      expect(eventRepository.create).toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('should throw BadRequestException if event date is in the past', async () => {
      const pastEventDto = {
        ...createEventDto,
        eventDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      await expect(
        service.create(pastEventDto, mockOrganizerId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(pastEventDto, mockOrganizerId),
      ).rejects.toThrow('La fecha del evento debe ser en el futuro');
    });

    it('should throw NotFoundException if venue does not exist', async () => {
      mockVenueRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createEventDto, mockOrganizerId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createEventDto, mockOrganizerId),
      ).rejects.toThrow('Recinto no encontrado');
    });

    it('should throw BadRequestException if totalTickets exceeds venue capacity', async () => {
      const exceededCapacityDto = {
        ...createEventDto,
        totalTickets: 1500, // Exceeds venue capacity of 1000
      };

      mockVenueRepository.findOne.mockResolvedValue(mockVenue);

      await expect(
        service.create(exceededCapacityDto, mockOrganizerId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(exceededCapacityDto, mockOrganizerId),
      ).rejects.toThrow(/excede la capacidad del recinto/);
    });
  });

  describe('findAllWithFilters', () => {
    it('should return paginated events with filters', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Event 1',
          category: EventCategory.CONCERT,
        },
        {
          id: 'event-2',
          title: 'Event 2',
          category: EventCategory.SPORTS,
        },
      ];

      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockEvents, 2]),
      };

      mockEventRepository.createQueryBuilder =
        jest.fn(() => mockQueryBuilder);

      const queryDto = {
        page: 1,
        limit: 10,
        category: EventCategory.CONCERT,
      };

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual(mockEvents);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should apply search filter', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockEventRepository.createQueryBuilder =
        jest.fn(() => mockQueryBuilder);

      const queryDto = {
        search: 'Rock',
      };

      await service.findAllWithFilters(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'event.title LIKE :search',
        { search: '%Rock%' },
      );
    });

    it('should apply city filter', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockEventRepository.createQueryBuilder =
        jest.fn(() => mockQueryBuilder);

      const queryDto = {
        city: 'Santiago',
      };

      await service.findAllWithFilters(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venue.city = :city',
        { city: 'Santiago' },
      );
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      const mockEvent = {
        id: 'event-uuid',
        title: 'Test Event',
        venue: mockVenue,
        organizer: { id: mockOrganizerId },
      };

      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne('event-uuid');

      expect(eventRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-uuid' },
        relations: ['venue', 'organizer'],
      });
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        'Evento no encontrado',
      );
    });
  });

  describe('findMyEvents', () => {
    it('should return events for the organizer', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockEventRepository.createQueryBuilder =
        jest.fn(() => mockQueryBuilder);

      const queryDto = { page: 1, limit: 10 };

      await service.findMyEvents(mockOrganizerId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'event.organizerId = :organizerId',
        { organizerId: mockOrganizerId },
      );
    });
  });

  describe('update', () => {
    const updateEventDto = {
      title: 'Updated Title',
      ticketPrice: 30000,
    };

    const mockEvent = {
      id: 'event-uuid',
      title: 'Original Title',
      organizerId: mockOrganizerId,
      eventDate: new Date(Date.now() + 86400000), // Tomorrow
      isCancelled: false,
      venue: mockVenue,
      soldTickets: 50,
    };

    it('should update an event successfully', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockEventRepository.save.mockResolvedValue({
        ...mockEvent,
        ...updateEventDto,
      });

      const result = await service.update(
        'event-uuid',
        updateEventDto,
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(result.title).toBe(updateEventDto.title);
      expect(result.ticketPrice).toBe(updateEventDto.ticketPrice);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      await expect(
        service.update(
          'event-uuid',
          updateEventDto,
          'different-user-id',
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super_admin to update any event', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockEventRepository.save.mockResolvedValue({
        ...mockEvent,
        ...updateEventDto,
      });

      const result = await service.update(
        'event-uuid',
        updateEventDto,
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );

      expect(result.title).toBe(updateEventDto.title);
    });

    it('should throw BadRequestException if event has already passed', async () => {
      const pastEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() - 86400000), // Yesterday
      };

      mockEventRepository.findOne.mockResolvedValue(pastEvent);

      await expect(
        service.update(
          'event-uuid',
          updateEventDto,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'event-uuid',
          updateEventDto,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(/ya finalizó/);
    });

    it('should throw BadRequestException if event is cancelled', async () => {
      const cancelledEvent = {
        ...mockEvent,
        isCancelled: true,
      };

      mockEventRepository.findOne.mockResolvedValue(cancelledEvent);

      await expect(
        service.update(
          'event-uuid',
          updateEventDto,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'event-uuid',
          updateEventDto,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(/cancelado/);
    });

    it('should throw BadRequestException if new event date is in the past', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const updateWithPastDate = {
        eventDate: new Date(Date.now() - 86400000).toISOString(),
      };

      await expect(
        service.update(
          'event-uuid',
          updateWithPastDate,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'event-uuid',
          updateWithPastDate,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(/debe ser en el futuro/);
    });

    it('should throw BadRequestException if totalTickets exceeds venue capacity', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const updateWithExceededCapacity = {
        totalTickets: 1500, // Exceeds venue capacity
      };

      await expect(
        service.update(
          'event-uuid',
          updateWithExceededCapacity,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'event-uuid',
          updateWithExceededCapacity,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(/excede la capacidad del recinto/);
    });

    it('should throw BadRequestException if totalTickets is less than soldTickets', async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const updateWithLessTickets = {
        totalTickets: 30, // Less than soldTickets (50)
      };

      await expect(
        service.update(
          'event-uuid',
          updateWithLessTickets,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'event-uuid',
          updateWithLessTickets,
          mockOrganizerId,
          UserRole.ORGANIZER,
        ),
      ).rejects.toThrow(/boletos ya vendidos/);
    });
  });

  describe('cancel', () => {
    const mockEvent = {
      id: 'event-uuid',
      title: 'Event to Cancel',
      organizerId: mockOrganizerId,
      eventDate: new Date(Date.now() + 86400000), // Tomorrow
      isCancelled: false,
    };

    it('should cancel an event successfully', async () => {
      const eventToCancel = { ...mockEvent };
      mockEventRepository.findOne.mockResolvedValue(eventToCancel);
      mockEventRepository.save.mockResolvedValue({
        ...eventToCancel,
        isCancelled: true,
        isActive: false,
      });

      const result = await service.cancel(
        'event-uuid',
        mockOrganizerId,
        UserRole.ORGANIZER,
      );

      expect(result.isCancelled).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const eventToCancel = { ...mockEvent };
      mockEventRepository.findOne.mockResolvedValue(eventToCancel);

      await expect(
        service.cancel('event-uuid', 'different-user-id', UserRole.ORGANIZER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super_admin to cancel any event', async () => {
      const eventToCancel = { ...mockEvent };
      mockEventRepository.findOne.mockResolvedValue(eventToCancel);
      mockEventRepository.save.mockResolvedValue({
        ...eventToCancel,
        isCancelled: true,
        isActive: false,
      });

      const result = await service.cancel(
        'event-uuid',
        'different-user-id',
        UserRole.SUPER_ADMIN,
      );

      expect(result.isCancelled).toBe(true);
    });

    it('should throw BadRequestException if event has already passed', async () => {
      const pastEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() - 86400000), // Yesterday
      };

      mockEventRepository.findOne.mockResolvedValue(pastEvent);

      await expect(
        service.cancel('event-uuid', mockOrganizerId, UserRole.ORGANIZER),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancel('event-uuid', mockOrganizerId, UserRole.ORGANIZER),
      ).rejects.toThrow(/ya finalizó/);
    });

    it('should throw BadRequestException if event is already cancelled', async () => {
      const cancelledEvent = {
        ...mockEvent,
        isCancelled: true,
      };

      mockEventRepository.findOne.mockResolvedValue(cancelledEvent);

      await expect(
        service.cancel('event-uuid', mockOrganizerId, UserRole.ORGANIZER),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancel('event-uuid', mockOrganizerId, UserRole.ORGANIZER),
      ).rejects.toThrow(/ya está cancelado/);
    });
  });
});
