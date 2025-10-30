import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateVenueDto } from '../../../../../src/modules/venues/dto/create-venue.dto';

describe('CreateVenueDto', () => {
  describe('validation', () => {
    it('should accept valid venue data', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject empty name', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: '',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should reject name exceeding 200 characters', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'A'.repeat(201),
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject address exceeding 500 characters', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'A'.repeat(501),
        city: 'Santiago',
        country: 'CL',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject city exceeding 100 characters', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'A'.repeat(101),
        country: 'CL',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid country code (not 2 characters)', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'USA',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject lowercase country code', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'cl',
        capacity: 1500,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject capacity of zero', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'CL',
        capacity: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject negative capacity', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Teatro Municipal',
        address: 'Agustinas 794',
        city: 'Santiago',
        country: 'CL',
        capacity: -100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept capacity of 1', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Small Room',
        address: 'Main St 123',
        city: 'Santiago',
        country: 'CL',
        capacity: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept large capacity', async () => {
      const dto = plainToClass(CreateVenueDto, {
        name: 'Estadio Nacional',
        address: 'Av. Grecia 2001',
        city: 'Santiago',
        country: 'CL',
        capacity: 50000,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject missing required fields', async () => {
      const dto = plainToClass(CreateVenueDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept various valid country codes', async () => {
      const countries = ['CL', 'US', 'AR', 'BR', 'MX', 'ES', 'FR', 'DE'];

      for (const country of countries) {
        const dto = plainToClass(CreateVenueDto, {
          name: 'Venue',
          address: 'Address 123',
          city: 'City',
          country,
          capacity: 1000,
        });

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });
});
