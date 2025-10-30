import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from '../../src/modules/events/events.module';
import { VenuesModule } from '../../src/modules/venues/venues.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { EventsService } from '../../src/modules/events/events.service';
import { VenuesService } from '../../src/modules/venues/venues.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { EventCategory } from '../../src/modules/events/enums/event-category.enum';

describe('Events Integration Tests', () => {
  let app: INestApplication;
  let eventsService: EventsService;
  let venuesService: VenuesService;
  let authService: AuthService;

  let organizerToken: string;
  let organizerId: string;
  let venueId: string;

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
        AuthModule,
        UsersModule,
        VenuesModule,
        EventsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    eventsService = moduleFixture.get<EventsService>(EventsService);
    venuesService = moduleFixture.get<VenuesService>(VenuesService);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Setup: Create organizer and venue
    const organizerData = {
      email: 'organizer@example.com',
      password: 'OrganizerPass123!',
      firstName: 'Event',
      lastName: 'Organizer',
      phone: '+56912345678',
    };

    const registerResult = await authService.register(organizerData);
    organizerToken = registerResult.token;
    organizerId = registerResult.user.id;

    // Create a venue
    const venueData = {
      name: 'Test Concert Hall',
      address: 'Main Street 123',
      city: 'Santiago',
      country: 'CL',
      capacity: 1000,
    };

    const venue = await venuesService.create(venueData);
    venueId = venue.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Event Creation Flow', () => {
    it('should create an event successfully', async () => {
      const createEventDto = {
        venueId,
        title: 'Rock Concert 2025',
        description:
          'An amazing rock concert with the best national bands. Doors open at 7 PM and the show starts at 9 PM.',
        category: EventCategory.CONCERT,
        eventDate: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days from now
        imageUrl: 'https://example.com/concert-banner.jpg',
        ticketPrice: 25000,
        totalTickets: 500,
      };

      const event = await eventsService.create(createEventDto, organizerId);

      expect(event).toHaveProperty('id');
      expect(event.title).toBe(createEventDto.title);
      expect(event.category).toBe(EventCategory.CONCERT);
      expect(event.totalTickets).toBe(500);
      expect(event.soldTickets).toBe(0);
      expect(event.isActive).toBe(true);
      expect(event.isCancelled).toBe(false);
      expect(event.organizerId).toBe(organizerId);
    });

    it('should fail to create event with past date', async () => {
      const pastEventDto = {
        venueId,
        title: 'Past Event',
        description:
          'This event is in the past and should not be allowed to be created at all.',
        category: EventCategory.SPORTS,
        eventDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        ticketPrice: 10000,
        totalTickets: 100,
      };

      await expect(
        eventsService.create(pastEventDto, organizerId),
      ).rejects.toThrow('La fecha del evento debe ser en el futuro');
    });

    it('should fail to create event exceeding venue capacity', async () => {
      const exceededCapacityDto = {
        venueId,
        title: 'Oversold Event',
        description:
          'This event has more tickets than the venue capacity and should fail validation.',
        category: EventCategory.CONCERT,
        eventDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        ticketPrice: 15000,
        totalTickets: 1500, // Exceeds venue capacity of 1000
      };

      await expect(
        eventsService.create(exceededCapacityDto, organizerId),
      ).rejects.toThrow(/excede la capacidad del recinto/);
    });

    it('should fail to create event with non-existent venue', async () => {
      const invalidVenueDto = {
        venueId: '00000000-0000-0000-0000-000000000000',
        title: 'Invalid Venue Event',
        description:
          'This event references a venue that does not exist and should fail.',
        category: EventCategory.OTHER,
        eventDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        ticketPrice: 5000,
        totalTickets: 50,
      };

      await expect(
        eventsService.create(invalidVenueDto, organizerId),
      ).rejects.toThrow('Recinto no encontrado');
    });
  });

  describe('Event Listing and Filtering', () => {
    beforeAll(async () => {
      // Create multiple events for testing filters
      const events = [
        {
          venueId,
          title: 'Rock Concert Santiago',
          description:
            'Amazing rock concert in Santiago with local and international bands.',
          category: EventCategory.CONCERT,
          eventDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          ticketPrice: 20000,
          totalTickets: 400,
        },
        {
          venueId,
          title: 'Football Match',
          description:
            'Exciting football match between two top teams in the national league.',
          category: EventCategory.SPORTS,
          eventDate: new Date(Date.now() + 20 * 86400000).toISOString(),
          ticketPrice: 15000,
          totalTickets: 800,
        },
        {
          venueId,
          title: 'Jazz Festival',
          description:
            'Three-day jazz festival featuring renowned international artists.',
          category: EventCategory.CONCERT,
          eventDate: new Date(Date.now() + 25 * 86400000).toISOString(),
          ticketPrice: 30000,
          totalTickets: 300,
        },
      ];

      for (const eventData of events) {
        await eventsService.create(eventData, organizerId);
      }
    });

    it('should list all events with pagination', async () => {
      const result = await eventsService.findAllWithFilters({
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBeGreaterThan(0);
    });

    it('should filter events by category', async () => {
      const result = await eventsService.findAllWithFilters({
        category: EventCategory.CONCERT,
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((event) => {
        expect(event.category).toBe(EventCategory.CONCERT);
      });
    });

    it('should search events by title', async () => {
      const result = await eventsService.findAllWithFilters({
        search: 'Rock',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((event) => {
        expect(event.title).toContain('Rock');
      });
    });

    it('should filter events by city', async () => {
      const result = await eventsService.findAllWithFilters({
        city: 'Santiago',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((event) => {
        expect(event.venue.city).toBe('Santiago');
      });
    });

    it('should filter events by organizer', async () => {
      const result = await eventsService.findAllWithFilters({
        organizerId,
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((event) => {
        expect(event.organizerId).toBe(organizerId);
      });
    });
  });

  describe('Event Update and Cancel Flow', () => {
    let eventId: string;

    beforeAll(async () => {
      const eventData = {
        venueId,
        title: 'Event to Update',
        description:
          'This is an event that will be updated and eventually cancelled during testing.',
        category: EventCategory.OTHER,
        eventDate: new Date(Date.now() + 40 * 86400000).toISOString(),
        ticketPrice: 12000,
        totalTickets: 200,
      };

      const event = await eventsService.create(eventData, organizerId);
      eventId = event.id;
    });

    it('should update event successfully', async () => {
      const updateDto = {
        title: 'Updated Event Title',
        ticketPrice: 15000,
      };

      const result = await eventsService.update(
        eventId,
        updateDto,
        organizerId,
        'organizador' as any,
      );

      expect(result.title).toBe(updateDto.title);
      expect(result.ticketPrice).toBe(updateDto.ticketPrice);
    });

    it('should cancel event successfully', async () => {
      const result = await eventsService.cancel(
        eventId,
        organizerId,
        'organizador' as any,
      );

      expect(result.isCancelled).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should fail to update cancelled event', async () => {
      const updateDto = {
        title: 'Try to Update Cancelled Event',
      };

      await expect(
        eventsService.update(eventId, updateDto, organizerId, 'organizador' as any),
      ).rejects.toThrow(/cancelado/);
    });
  });

  describe('My Events Flow', () => {
    it('should return only organizer events', async () => {
      const result = await eventsService.findMyEvents(organizerId, {
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((event) => {
        expect(event.organizerId).toBe(organizerId);
      });
    });
  });
});
