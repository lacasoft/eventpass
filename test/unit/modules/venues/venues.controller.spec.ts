import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VenuesController } from '../../../../src/modules/venues/venues.controller';
import { VenuesService } from '../../../../src/modules/venues/venues.service';
import { CreateVenueDto } from '../../../../src/modules/venues/dto/create-venue.dto';
import { QueryVenuesDto } from '../../../../src/modules/venues/dto/query-venues.dto';
import { Venue } from '../../../../src/modules/venues/entities/venue.entity';
import { PaginatedResult } from '../../../../src/common/dto/pagination.dto';

describe('VenuesController', () => {
  let controller: VenuesController;
  let service: VenuesService;

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

  const mockVenuesService = {
    create: jest.fn(),
    findAllWithFilters: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        {
          provide: VenuesService,
          useValue: mockVenuesService,
        },
      ],
    }).compile();

    controller = module.get<VenuesController>(VenuesController);
    service = module.get<VenuesService>(VenuesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new venue', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      };

      mockVenuesService.create.mockResolvedValue(mockVenue);

      const result = await controller.create(createVenueDto);

      expect(result).toEqual(mockVenue);
      expect(service.create).toHaveBeenCalledWith(createVenueDto);
      expect(service.create).toHaveBeenCalledTimes(1);
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

      mockVenuesService.create.mockResolvedValue(smallVenue);

      const result = await controller.create(createVenueDto);

      expect(result).toEqual(smallVenue);
      expect(service.create).toHaveBeenCalledWith(createVenueDto);
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

      mockVenuesService.create.mockResolvedValue(usVenue);

      const result = await controller.create(createVenueDto);

      expect(result).toEqual(usVenue);
      expect(service.create).toHaveBeenCalledWith(createVenueDto);
    });

    it('should propagate service errors', async () => {
      const createVenueDto: CreateVenueDto = {
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      };

      const error = new Error('Database connection failed');
      mockVenuesService.create.mockRejectedValue(error);

      await expect(controller.create(createVenueDto)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith(createVenueDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated venues without filters', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
      };

      const paginatedResult: PaginatedResult<Venue> = {
        data: [mockVenue],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockVenuesService.findAllWithFilters.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(service.findAllWithFilters).toHaveBeenCalledTimes(1);
    });

    it('should return paginated venues with city filter', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
        city: 'Santiago',
      };

      const paginatedResult: PaginatedResult<Venue> = {
        data: [mockVenue],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockVenuesService.findAllWithFilters.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
    });

    it('should return paginated venues with search filter', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
        search: 'Teatro',
      };

      const paginatedResult: PaginatedResult<Venue> = {
        data: [mockVenue],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockVenuesService.findAllWithFilters.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
    });

    it('should handle pagination correctly', async () => {
      const queryDto: QueryVenuesDto = {
        page: 2,
        limit: 20,
      };

      const paginatedResult: PaginatedResult<Venue> = {
        data: [mockVenue],
        meta: {
          page: 2,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      };

      mockVenuesService.findAllWithFilters.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
    });

    it('should return empty result when no venues found', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
      };

      const paginatedResult: PaginatedResult<Venue> = {
        data: [],
        meta: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockVenuesService.findAllWithFilters.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResult);
      expect(result.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      const queryDto: QueryVenuesDto = {
        page: 1,
        limit: 50,
      };

      const error = new Error('Database connection failed');
      mockVenuesService.findAllWithFilters.mockRejectedValue(error);

      await expect(controller.findAll(queryDto)).rejects.toThrow(error);
      expect(service.findAllWithFilters).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('findOne', () => {
    it('should return a venue by id', async () => {
      mockVenuesService.findOne.mockResolvedValue(mockVenue);

      const result = await controller.findOne(mockVenue.id);

      expect(result).toEqual(mockVenue);
      expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when venue not found', async () => {
      const notFoundError = new NotFoundException('Venue not found');
      mockVenuesService.findOne.mockRejectedValue(notFoundError);

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        'Venue not found',
      );
      expect(service.findOne).toHaveBeenCalledWith('non-existent-id');
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database connection failed');
      mockVenuesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(mockVenue.id)).rejects.toThrow(error);
      expect(service.findOne).toHaveBeenCalledWith(mockVenue.id);
    });
  });
});
