import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../../src/config/app.config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

// Módulos
import { AnalyticsModule } from '../../src/modules/analytics/analytics.module';
import { BookingsModule } from '../../src/modules/bookings/bookings.module';
import { PaymentsModule } from '../../src/modules/payments/payments.module';
import { EventsModule } from '../../src/modules/events/events.module';
import { VenuesModule } from '../../src/modules/venues/venues.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';

// Services
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { EventsService } from '../../src/modules/events/events.service';
import { VenuesService } from '../../src/modules/venues/venues.service';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import { UsersService } from '../../src/modules/users/users.service';

// Entities
import { Event } from '../../src/modules/events/entities/event.entity';
import { Booking } from '../../src/modules/bookings/entities/booking.entity';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import { User } from '../../src/modules/users/entities/user.entity';

// Enums
import { EventCategory } from '../../src/modules/events/enums/event-category.enum';
import { BookingStatus } from '../../src/modules/bookings/enums/booking-status.enum';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum';
import { UserRole } from '../../src/modules/users/enums/user-role.enum';

describe('Analytics Integration Tests', () => {
  let app: INestApplication;
  let analyticsService: AnalyticsService;
  let authService: AuthService;
  let usersService: UsersService;
  let eventsService: EventsService;
  let venuesService: VenuesService;
  let bookingsService: BookingsService;

  let eventRepository: Repository<Event>;
  let bookingRepository: Repository<Booking>;
  let paymentRepository: Repository<Payment>;
  let userRepository: Repository<User>;

  let organizerToken: string;
  let organizerId: string;
  let adminToken: string;
  let adminId: string;
  let customerToken: string;
  let customerId: string;
  let venueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [appConfig], // Cargar configuración de app para JWT_SECRET
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'toor',
          database: 'eventpass_test_integration',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true, // Drop and recreate schema on start
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: 300000,
        }),
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const redisConfig: any = {
              host: configService.get('REDIS_HOST') || 'localhost',
              port: configService.get('REDIS_PORT') || 6379,
            };

            const redisPassword = configService.get('REDIS_PASSWORD');
            if (redisPassword) {
              redisConfig.password = redisPassword;
            }

            return { redis: redisConfig };
          },
          inject: [ConfigService],
        }),
        AuthModule,
        UsersModule,
        VenuesModule,
        EventsModule,
        BookingsModule,
        PaymentsModule,
        AnalyticsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    eventsService = moduleFixture.get<EventsService>(EventsService);
    venuesService = moduleFixture.get<VenuesService>(VenuesService);
    bookingsService = moduleFixture.get<BookingsService>(BookingsService);

    eventRepository = moduleFixture.get<Repository<Event>>(getRepositoryToken(Event));
    bookingRepository = moduleFixture.get<Repository<Booking>>(getRepositoryToken(Booking));
    paymentRepository = moduleFixture.get<Repository<Payment>>(getRepositoryToken(Payment));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Crear usuarios de prueba una sola vez
    const timestamp = Date.now();

    // Crear organizador
    const organizer = await usersService.create(
      {
        email: `organizer-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Organizer',
        role: UserRole.ORGANIZADOR,
      },
      UserRole.SUPER_ADMIN,
    );
    organizerId = organizer.id;
    const organizerLogin = await authService.login({
      email: organizer.email,
      password: 'Password123!',
    });
    organizerToken = organizerLogin.token;

    // Crear admin
    const admin = await usersService.create(
      {
        email: `admin-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Admin',
        role: UserRole.ADMIN,
      },
      UserRole.SUPER_ADMIN,
    );
    adminId = admin.id;
    const adminLogin = await authService.login({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminLogin.token;

    // Crear customer
    const customerRegister = await authService.register({
      email: `customer-${timestamp}@test.com`,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'Customer',
    });
    customerToken = customerRegister.token;
    customerId = customerRegister.user.id;

    // Crear venue principal
    const venue = await venuesService.create({
      name: 'Test Venue',
      address: '123 Test St',
      city: 'Test City',
      country: 'CL',
      capacity: 1000,
    });
    venueId = venue.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Solo limpiar datos transaccionales (eventos, bookings, payments)
    // Mantener usuarios y venue principal estables
    const payments = await paymentRepository.find();
    for (const payment of payments) {
      await paymentRepository.remove(payment);
    }

    const bookings = await bookingRepository.find();
    for (const booking of bookings) {
      await bookingRepository.remove(booking);
    }

    const events = await eventRepository.find();
    for (const event of events) {
      await eventRepository.remove(event);
    }
  });

  describe('GET /analytics/organizer/dashboard', () => {
    it('should return organizer dashboard with no events', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('events');
      expect(response.body.summary.totalEvents).toBe(0);
      expect(response.body.summary.activeEvents).toBe(0);
      expect(response.body.summary.totalTicketsSold).toBe(0);
      expect(response.body.summary.grossRevenue).toBe(0);
      expect(response.body.summary.netRevenue).toBe(0);
      expect(response.body.summary.platformFees).toBe(0);
      expect(response.body.events).toEqual([]);
    });

    it('should return organizer dashboard with events and bookings', async () => {
      // Crear evento
      const event = await eventsService.create(
        {
          title: 'Test Event 1',
          description: 'Test Description',
          category: EventCategory.CONCERT,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 50,
          totalTickets: 100,
          venueId,
        },
        organizerId,
      );

      // Crear booking confirmado
      const booking = await bookingRepository.save({
        userId: customerId,
        eventId: event.id,
        quantity: 2,
        unitPrice: 50,
        subtotal: 100,
        serviceFee: 15,
        total: 115,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      // Actualizar soldTickets del evento
      await eventRepository.update(event.id, {
        soldTickets: 2,
        availableTickets: 98,
      });

      // Crear pago exitoso
      await paymentRepository.save({
        stripePaymentIntentId: `pi_test_${Date.now()}`,
        bookingId: booking.id,
        userId: customerId,
        eventId: event.id,
        amount: 11500,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        succeededAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.summary.totalEvents).toBe(1);
      expect(response.body.summary.activeEvents).toBe(1);
      expect(response.body.summary.totalTicketsSold).toBe(2);
      expect(response.body.summary.grossRevenue).toBe(115);
      expect(response.body.summary.netRevenue).toBe(100);
      expect(response.body.summary.platformFees).toBe(15);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].id).toBe(event.id);
      expect(response.body.events[0].title).toBe('Test Event 1');
      expect(response.body.events[0].soldTickets).toBe(2);
      expect(response.body.events[0].availableTickets).toBe(98);
      expect(response.body.events[0].occupancyRate).toBe(2.0);
      expect(response.body.events[0].revenue).toBe(115);
      expect(response.body.events[0].status).toBe('published');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .expect(401);
    });

    it('should require organizer role', async () => {
      await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should only show organizer own events', async () => {
      // Crear evento del organizador
      const organizerEvent = await eventsService.create(
        {
          title: 'Organizer Event',
          description: 'Test Description',
          category: EventCategory.CONCERT,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 50,
          totalTickets: 100,
          venueId,
        },
        organizerId,
      );

      // Crear otro organizador y su evento
      const timestamp2 = Date.now() + 1000;
      const otherOrganizer = await usersService.create(
        {
          email: `other-${timestamp2}@test.com`,
          password: 'Password123!',
          firstName: 'Other',
          lastName: 'Organizer',
          role: UserRole.ORGANIZADOR,
        },
        UserRole.SUPER_ADMIN,
      );

      const otherVenue = await venuesService.create({
        name: 'Other Venue',
        address: '456 Other St',
        city: 'Other City',
        country: 'US',
        capacity: 500,
      });

      await eventsService.create(
        {
          title: 'Other Organizer Event',
          description: 'Other Description',
          category: EventCategory.SPORTS,
          eventDate: '2025-11-30T18:00:00Z',
          ticketPrice: 75,
          totalTickets: 200,
          venueId: otherVenue.id,
        },
        otherOrganizer.id,
      );

      const response = await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.summary.totalEvents).toBe(1);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].id).toBe(organizerEvent.id);
      expect(response.body.events[0].title).toBe('Organizer Event');
    });
  });

  describe('GET /analytics/events/:id/stats', () => {
    it('should return event statistics', async () => {
      // Crear evento
      const event = await eventsService.create(
        {
          title: 'Test Event Stats',
          description: 'Test Description',
          category: EventCategory.OTHER,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 100,
          totalTickets: 200,
          venueId,
        },
        organizerId,
      );

      // Crear múltiples bookings
      const booking1 = await bookingRepository.save({
        userId: customerId,
        eventId: event.id,
        quantity: 3,
        unitPrice: 100,
        subtotal: 300,
        serviceFee: 45,
        total: 345,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date('2025-01-15T10:00:00Z'),
        createdAt: new Date('2025-01-15T10:00:00Z'),
      });

      const booking2 = await bookingRepository.save({
        userId: customerId,
        eventId: event.id,
        quantity: 2,
        unitPrice: 100,
        subtotal: 200,
        serviceFee: 30,
        total: 230,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date('2025-01-16T14:00:00Z'),
        createdAt: new Date('2025-01-16T14:00:00Z'),
      });

      // Actualizar soldTickets
      await eventRepository.update(event.id, {
        soldTickets: 5,
        availableTickets: 195,
      });

      // Crear pagos exitosos
      await paymentRepository.save({
        stripePaymentIntentId: `pi_test_1_${Date.now()}`,
        bookingId: booking1.id,
        userId: customerId,
        eventId: event.id,
        amount: 34500,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        succeededAt: new Date(),
      });

      await paymentRepository.save({
        stripePaymentIntentId: `pi_test_2_${Date.now()}`,
        bookingId: booking2.id,
        userId: customerId,
        eventId: event.id,
        amount: 23000,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        succeededAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/analytics/events/${event.id}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body.event.id).toBe(event.id);
      expect(response.body.event.title).toBe('Test Event Stats');

      expect(response.body.stats.totalTickets).toBe(200);
      expect(response.body.stats.soldTickets).toBe(5);
      expect(response.body.stats.availableTickets).toBe(195);
      expect(response.body.stats.occupancyRate).toBe(2.5);
      expect(response.body.stats.grossRevenue).toBe(575);
      expect(response.body.stats.serviceFees).toBe(75);
      expect(response.body.stats.netRevenue).toBe(500);
      expect(response.body.stats.averageTicketPrice).toBe(115);
      expect(response.body.stats.totalBookings).toBe(2);
      expect(response.body.stats.averageTicketsPerBooking).toBe(2.5);

      expect(response.body.salesOverTime).toBeDefined();
      expect(Array.isArray(response.body.salesOverTime)).toBe(true);
    });

    it('should return 404 for non-existent event', async () => {
      await request(app.getHttpServer())
        .get('/analytics/events/00000000-0000-0000-0000-000000000000/stats')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(404);
    });

    it('should return 403 if user is not owner', async () => {
      // Crear otro organizador
      const timestamp3 = Date.now() + 2000;
      const otherOrganizer = await usersService.create(
        {
          email: `other2-${timestamp3}@test.com`,
          password: 'Password123!',
          firstName: 'Other',
          lastName: 'Organizer',
          role: UserRole.ORGANIZADOR,
        },
        UserRole.SUPER_ADMIN,
      );

      const otherVenue = await venuesService.create({
        name: 'Other Venue 2',
        address: '789 Other St',
        city: 'Other City',
        country: 'MX',
        capacity: 300,
      });

      const otherEvent = await eventsService.create(
        {
          title: 'Other Event',
          description: 'Other Description',
          category: EventCategory.CONCERT,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 50,
          totalTickets: 100,
          venueId: otherVenue.id,
        },
        otherOrganizer.id,
      );

      await request(app.getHttpServer())
        .get(`/analytics/events/${otherEvent.id}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(403);
    });

    it('should allow admin to view any event stats', async () => {
      const event = await eventsService.create(
        {
          title: 'Admin View Event',
          description: 'Test Description',
          category: EventCategory.CONCERT,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 50,
          totalTickets: 100,
          venueId,
        },
        organizerId,
      );

      const response = await request(app.getHttpServer())
        .get(`/analytics/events/${event.id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.event.id).toBe(event.id);
    });
  });

  describe('GET /analytics/admin/dashboard', () => {
    it('should return admin dashboard', async () => {
      // Crear evento
      const event = await eventsService.create(
        {
          title: 'Admin Dashboard Event',
          description: 'Test Description',
          category: EventCategory.CONCERT,
          eventDate: '2025-12-31T20:00:00Z',
          ticketPrice: 60,
          totalTickets: 150,
          venueId,
        },
        organizerId,
      );

      // Crear booking
      const booking = await bookingRepository.save({
        userId: customerId,
        eventId: event.id,
        quantity: 4,
        unitPrice: 60,
        subtotal: 240,
        serviceFee: 36,
        total: 276,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      await eventRepository.update(event.id, {
        soldTickets: 4,
        availableTickets: 146,
      });

      await paymentRepository.save({
        stripePaymentIntentId: `pi_admin_test_${Date.now()}`,
        bookingId: booking.id,
        userId: customerId,
        eventId: event.id,
        amount: 27600,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        succeededAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('topEvents');
      expect(response.body).toHaveProperty('topOrganizers');
      expect(response.body).toHaveProperty('recentActivity');

      expect(response.body.summary.totalUsers).toBeGreaterThanOrEqual(3);
      expect(response.body.summary.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(response.body.summary.totalOrganizers).toBeGreaterThanOrEqual(1);
      expect(response.body.summary.totalAdmins).toBeGreaterThanOrEqual(1);
      expect(response.body.summary.totalEvents).toBeGreaterThanOrEqual(1);
      expect(response.body.summary.activeEvents).toBeGreaterThanOrEqual(1);
      expect(response.body.summary.totalTicketsSold).toBeGreaterThanOrEqual(4);
      expect(response.body.summary.grossRevenue).toBeGreaterThanOrEqual(276);
      expect(response.body.summary.platformRevenue).toBeGreaterThanOrEqual(36);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/admin/dashboard')
        .expect(401);
    });

    it('should require admin role', async () => {
      await request(app.getHttpServer())
        .get('/analytics/admin/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(403);
    });

    it('should not allow customer role', async () => {
      await request(app.getHttpServer())
        .get('/analytics/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});
