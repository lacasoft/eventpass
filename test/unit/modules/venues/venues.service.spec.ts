import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VenuesService } from '../../../../src/modules/venues/venues.service';
import { Venue } from '../../../../src/modules/venues/entities/venue.entity';
import { CreateVenueDto } from '../../../../src/modules/venues/dto/create-venue.dto';
import { QueryVenuesDto } from '../../../../src/modules/venues/dto/query-venues.dto';

describe('VenuesService', () => {
  let service: VenuesService;
  let repository: Repository<Venue>;

  const mockVenue: Venue = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Teatro Municipal de Santiago',
    address: 'Agustinas 794, Santiago Centro',
    city: 'Santiago',
    country: 'CL',
    capacity: 1500,
    createdAt: new Date('2025-01-20T10:30:00.000Z'),
    updatedAt: new Date('2025-01-20T10:30:00.000Z'),
    deletedAt: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: getRepositoryToken(Venue),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    repository = module.get<Repository<Venue>>(getRepositoryToken(Venue));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new venue', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      };

      mockRepository.create.mockReturnValue(mockVenue);
      mockRepository.save.mockResolvedValue(mockVenue);

      const result = await service.create(createVenueDto);

      expect(result).toEqual(mockVenue);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
      expect(repository.save).toHaveBeenCalledWith(mockVenue);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should create a venue with minimum capacity', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Sala Pequeña',
        address: 'Calle Principal 123',
        city: 'Valparaíso',
        country: 'CL',
        capacity: 1,
      };

      const smallVenue = {
        ...mockVenue,
        name: 'Sala Pequeña',
        address: 'Calle Principal 123',
        city: 'Valparaíso',
        capacity: 1,
      };

      mockRepository.create.mockReturnValue(smallVenue);
      mockRepository.save.mockResolvedValue(smallVenue);

      const result = await service.create(createVenueDto);

      expect(result).toEqual(smallVenue);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
      expect(repository.save).toHaveBeenCalledWith(smallVenue);
    });

    it('should create a venue with large capacity', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Estadio Nacional',
        address: 'Av. Grecia 2001',
        city: 'Santiago',
        country: 'CL',
        capacity: 48665,
      };

      const largeVenue = {
        ...mockVenue,
        name: 'Estadio Nacional',
        address: 'Av. Grecia 2001',
        capacity: 48665,
      };

      mockRepository.create.mockReturnValue(largeVenue);
      mockRepository.save.mockResolvedValue(largeVenue);

      const result = await service.create(createVenueDto);

      expect(result).toEqual(largeVenue);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
    });

    it('should create a venue with different country code', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Madison Square Garden',
        address: '4 Pennsylvania Plaza',
        city: 'New York',
        country: 'US',
        capacity: 20000,
      };

      const usVenue = {
        ...mockVenue,
        name: 'Madison Square Garden',
        address: '4 Pennsylvania Plaza',
        city: 'New York',
        country: 'US',
        capacity: 20000,
      };

      mockRepository.create.mockReturnValue(usVenue);
      mockRepository.save.mockResolvedValue(usVenue);

      const result = await service.create(createVenueDto);

      expect(result).toEqual(usVenue);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
    });

    it('should handle database errors', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      };

      const error = new Error('Database connection failed');
      mockRepository.create.mockReturnValue(mockVenue);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createVenueDto)).rejects.toThrow(error);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
      expect(repository.save).toHaveBeenCalledWith(mockVenue);
    });

    it('should create venue with maximum allowed string lengths', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'A'.repeat(200),
        address: 'B'.repeat(500),
        city: 'C'.repeat(100),
        country: 'MX',
        capacity: 5000,
      };

      const maxLengthVenue = {
        ...mockVenue,
        name: 'A'.repeat(200),
        address: 'B'.repeat(500),
        city: 'C'.repeat(100),
        country: 'MX',
        capacity: 5000,
      };

      mockRepository.create.mockReturnValue(maxLengthVenue);
      mockRepository.save.mockResolvedValue(maxLengthVenue);

      const result = await service.create(createVenueDto);

      expect(result).toEqual(maxLengthVenue);
      expect(repository.create).toHaveBeenCalledWith(createVenueDto);
    });
  });

  describe('findAllWithFilters', () => {
    it('should return paginated venues without filters', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
      };

      const venues = [mockVenue];
      const total = 1;

      mockRepository.findAndCount.mockResolvedValue([venues, total]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result).toEqual({
        data: venues,
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter venues by city', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
        city: 'Santiago',
      };

      const venues = [mockVenue];
      const total = 1;

      mockRepository.findAndCount.mockResolvedValue([venues, total]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual(venues);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { city: 'Santiago' },
        }),
      );
    });

    it('should search venues by name', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
        search: 'Teatro',
      };

      const venues = [mockVenue];
      const total = 1;

      mockRepository.findAndCount.mockResolvedValue([venues, total]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual(venues);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.anything(),
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const queryDto: QueryVenuesDto = {
        page: 2,
        limit: 20,
      };

      const venues = [mockVenue];
      const total = 50;

      mockRepository.findAndCount.mockResolvedValue([venues, total]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });

    it('should combine city filter and search', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
        city: 'Santiago',
        search: 'Teatro',
      };

      const venues = [mockVenue];
      const total = 1;

      mockRepository.findAndCount.mockResolvedValue([venues, total]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual(venues);
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'Santiago',
            name: expect.anything(),
          }),
        }),
      );
    });

    it('should return empty array when no venues found', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
      };

      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a venue by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockVenue);

      const result = await service.findOne(mockVenue.id);

      expect(result).toEqual(mockVenue);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockVenue.id },
      });
    });

    it('should throw NotFoundException when venue not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Venue not found',
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findOne(mockVenue.id)).rejects.toThrow(error);
    });
  });
});
