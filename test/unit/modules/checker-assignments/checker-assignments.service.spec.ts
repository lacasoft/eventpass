import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CheckerAssignmentsService } from '../../../../src/modules/checker-assignments/checker-assignments.service';
import { CheckerAssignment } from '../../../../src/modules/checker-assignments/entities/checker-assignment.entity';
import { User } from '../../../../src/modules/users/entities/user.entity';
import { Event } from '../../../../src/modules/events/entities/event.entity';
import { Venue } from '../../../../src/modules/venues/entities/venue.entity';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('CheckerAssignmentsService', () => {
  let service: CheckerAssignmentsService;
  let assignmentRepository: Repository<CheckerAssignment>;
  let userRepository: Repository<User>;
  let eventRepository: Repository<Event>;
  let venueRepository: Repository<Venue>;

  const mockAssignmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockEventRepository = {
    find: jest.fn(),
  };

  const mockVenueRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckerAssignmentsService,
        {
          provide: getRepositoryToken(CheckerAssignment),
          useValue: mockAssignmentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
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

    service = module.get<CheckerAssignmentsService>(CheckerAssignmentsService);
    assignmentRepository = module.get<Repository<CheckerAssignment>>(
      getRepositoryToken(CheckerAssignment),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    venueRepository = module.get<Repository<Venue>>(getRepositoryToken(Venue));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssignments', () => {
    const mockChecker = {
      id: 'checker-id',
      email: 'checker@example.com',
      role: UserRole.CHECKER,
      isActive: true,
    } as User;

    const mockVenues = [
      { id: 'venue-1', name: 'Venue 1' },
      { id: 'venue-2', name: 'Venue 2' },
    ] as Venue[];

    const mockEvents = [
      { id: 'event-1', title: 'Event 1', isActive: true },
      { id: 'event-2', title: 'Event 2', isActive: true },
    ] as Event[];

    const createDto = {
      checkerId: 'checker-id',
      venueIds: ['venue-1', 'venue-2'],
      eventIds: ['event-1', 'event-2'],
    };

    it('should create assignments successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockChecker);
      mockVenueRepository.find.mockResolvedValue(mockVenues);
      mockEventRepository.find.mockResolvedValue(mockEvents);
      mockAssignmentRepository.find.mockResolvedValue([]);

      const mockAssignments = [
        {
          id: 'assignment-1',
          checkerId: 'checker-id',
          venueId: 'venue-1',
          eventId: 'event-1',
          assignedBy: 'admin-id',
          isActive: true,
        },
        {
          id: 'assignment-2',
          checkerId: 'checker-id',
          venueId: 'venue-1',
          eventId: 'event-2',
          assignedBy: 'admin-id',
          isActive: true,
        },
        {
          id: 'assignment-3',
          checkerId: 'checker-id',
          venueId: 'venue-2',
          eventId: 'event-1',
          assignedBy: 'admin-id',
          isActive: true,
        },
        {
          id: 'assignment-4',
          checkerId: 'checker-id',
          venueId: 'venue-2',
          eventId: 'event-2',
          assignedBy: 'admin-id',
          isActive: true,
        },
      ];

      mockAssignmentRepository.create.mockImplementation((data) => data);
      mockAssignmentRepository.save.mockResolvedValue(mockAssignments);

      const result = await service.createAssignments(createDto, 'admin-id');

      expect(result).toEqual(mockAssignments);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'checker-id' },
      });
      expect(mockVenueRepository.find).toHaveBeenCalled();
      expect(mockEventRepository.find).toHaveBeenCalled();
      expect(mockAssignmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when checker not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not a CHECKER', async () => {
      const nonChecker = { ...mockChecker, role: UserRole.CLIENTE };
      mockUserRepository.findOne.mockResolvedValue(nonChecker);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when checker is inactive', async () => {
      const inactiveChecker = { ...mockChecker, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveChecker);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when venues not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockChecker);
      mockVenueRepository.find.mockResolvedValue([mockVenues[0]]);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when events not found or inactive', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockChecker);
      mockVenueRepository.find.mockResolvedValue(mockVenues);
      mockEventRepository.find.mockResolvedValue([mockEvents[0]]);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when assignments already exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockChecker);
      mockVenueRepository.find.mockResolvedValue(mockVenues);
      mockEventRepository.find.mockResolvedValue(mockEvents);
      mockAssignmentRepository.find.mockResolvedValue([
        {
          id: 'existing-assignment',
          checkerId: 'checker-id',
          venueId: 'venue-1',
          eventId: 'event-1',
        },
      ]);

      await expect(
        service.createAssignments(createDto, 'admin-id'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all assignments with filters', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          checkerId: 'checker-id',
          venueId: 'venue-1',
          eventId: 'event-1',
          isActive: true,
        },
      ];

      mockAssignmentRepository.find.mockResolvedValue(mockAssignments);

      const result = await service.findAll({
        checkerId: 'checker-id',
        isActive: true,
      });

      expect(result).toEqual(mockAssignments);
      expect(mockAssignmentRepository.find).toHaveBeenCalledWith({
        where: { checkerId: 'checker-id', isActive: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an assignment by id', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        checkerId: 'checker-id',
        venueId: 'venue-1',
        eventId: 'event-1',
      };

      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

      const result = await service.findOne('assignment-1');

      expect(result).toEqual(mockAssignment);
      expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('should throw NotFoundException when assignment not found', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByChecker', () => {
    it('should return assignments for a specific checker', async () => {
      const mockChecker = {
        id: 'checker-id',
        role: UserRole.CHECKER,
      } as User;

      const mockAssignments = [
        {
          id: 'assignment-1',
          checkerId: 'checker-id',
          venueId: 'venue-1',
          eventId: 'event-1',
          isActive: true,
        },
      ];

      mockUserRepository.findOne.mockResolvedValue(mockChecker);
      mockAssignmentRepository.find.mockResolvedValue(mockAssignments);

      const result = await service.findByChecker('checker-id');

      expect(result).toEqual(mockAssignments);
      expect(mockAssignmentRepository.find).toHaveBeenCalledWith({
        where: { checkerId: 'checker-id', isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException when checker not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByChecker('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeAssignment', () => {
    it('should deactivate an assignment', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        isActive: true,
      };

      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      mockAssignmentRepository.update.mockResolvedValue({ affected: 1 });

      await service.removeAssignment('assignment-1');

      expect(mockAssignmentRepository.update).toHaveBeenCalledWith(
        { id: 'assignment-1' },
        { isActive: false },
      );
    });
  });

  describe('activateAssignment', () => {
    it('should activate an assignment', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        isActive: false,
      };

      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      mockAssignmentRepository.save.mockResolvedValue({
        ...mockAssignment,
        isActive: true,
      });

      const result = await service.activateAssignment('assignment-1');

      expect(result.isActive).toBe(true);
      expect(mockAssignmentRepository.save).toHaveBeenCalled();
    });
  });
});
