import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuesModule } from '../../src/modules/venues/venues.module';
import { ConfigModule } from '@nestjs/config';
import { VenuesService } from '../../src/modules/venues/venues.service';

describe('Venues Integration Tests', () => {
  let app: INestApplication;
  let venuesService: VenuesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        VenuesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    venuesService = moduleFixture.get<VenuesService>(VenuesService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Venue CRUD Operations', () => {
    let venueId: string;

    it('should create a new venue', async () => {
      const venueData = {
        name: 'Teatro Municipal de Santiago',
        address: 'Agustinas 794, Santiago Centro',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      };

      const result = await venuesService.create(venueData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(venueData.name);
      expect(result.capacity).toBe(venueData.capacity);
      venueId = result.id;
    });

    it('should find venue by id', async () => {
      const venue = await venuesService.findOne(venueId);

      expect(venue.id).toBe(venueId);
      expect(venue.name).toBe('Teatro Municipal de Santiago');
    });

    it('should throw error for non-existent venue', async () => {
      await expect(
        venuesService.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow();
    });
  });

  describe('Venue Listing and Filtering', () => {
    beforeAll(async () => {
      // Create multiple venues for testing
      await venuesService.create({
        name: 'Estadio Nacional',
        address: 'Av. Grecia 2001',
        city: 'Santiago',
        country: 'CL',
        capacity: 48000,
      });

      await venuesService.create({
        name: 'Teatro Caupolicán',
        address: 'San Diego 850',
        city: 'Santiago',
        country: 'CL',
        capacity: 5000,
      });

      await venuesService.create({
        name: 'Movistar Arena',
        address: 'Tupper 2359',
        city: 'Santiago',
        country: 'CL',
        capacity: 15000,
      });

      await venuesService.create({
        name: 'Teatro Municipal de Viña',
        address: 'Plaza Vergara',
        city: 'Viña del Mar',
        country: 'CL',
        capacity: 1200,
      });
    });

    it('should list all venues with pagination', async () => {
      const result = await venuesService.findAllWithFilters({
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta.total).toBeGreaterThan(0);
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('totalPages');
    });

    it('should filter venues by city', async () => {
      const result = await venuesService.findAllWithFilters({
        page: 1,
        limit: 10,
        city: 'Santiago',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((venue) => {
        expect(venue.city).toBe('Santiago');
      });
    });

    it('should search venues by name', async () => {
      const result = await venuesService.findAllWithFilters({
        page: 1,
        limit: 10,
        search: 'Teatro',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((venue) => {
        expect(venue.name.toLowerCase()).toContain('teatro');
      });
    });

    it('should handle pagination correctly', async () => {
      const page1 = await venuesService.findAllWithFilters({
        page: 1,
        limit: 2,
      });

      const page2 = await venuesService.findAllWithFilters({
        page: 2,
        limit: 2,
      });

      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBeGreaterThan(0);
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
      expect(page1.meta.hasNextPage).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      const result = await venuesService.findAllWithFilters({
        page: 1,
        limit: 10,
        city: 'NonExistentCity',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should combine filters correctly', async () => {
      const result = await venuesService.findAllWithFilters({
        page: 1,
        limit: 10,
        city: 'Santiago',
        search: 'Estadio',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((venue) => {
        expect(venue.city).toBe('Santiago');
        expect(venue.name.toLowerCase()).toContain('estadio');
      });
    });
  });

  describe('Venue Capacity Validation', () => {
    it('should accept minimum capacity of 1', async () => {
      const venue = await venuesService.create({
        name: 'Small Room',
        address: 'Main St 123',
        city: 'Santiago',
        country: 'CL',
        capacity: 1,
      });

      expect(venue.capacity).toBe(1);
    });

    it('should accept large capacity', async () => {
      const venue = await venuesService.create({
        name: 'Large Stadium',
        address: 'Stadium Ave 456',
        city: 'Santiago',
        country: 'CL',
        capacity: 100000,
      });

      expect(venue.capacity).toBe(100000);
    });
  });
});
