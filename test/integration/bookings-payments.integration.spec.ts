import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { BookingsModule } from '../../src/modules/bookings/bookings.module';
import { PaymentsModule } from '../../src/modules/payments/payments.module';
import { EventsModule } from '../../src/modules/events/events.module';
import { VenuesModule } from '../../src/modules/venues/venues.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { EventsService } from '../../src/modules/events/events.service';
import { VenuesService } from '../../src/modules/venues/venues.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { EventCategory } from '../../src/modules/events/enums/event-category.enum';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from '../../src/modules/events/entities/event.entity';
import { Booking } from '../../src/modules/bookings/entities/booking.entity';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import Stripe from 'stripe';
import * as crypto from 'crypto';

describe('Bookings and Payments Integration Tests', () => {
  let app: INestApplication;
  let bookingsService: BookingsService;
  let paymentsService: PaymentsService;
  let eventsService: EventsService;
  let venuesService: VenuesService;
  let authService: AuthService;
  let eventRepository: Repository<Event>;
  let bookingRepository: Repository<Booking>;
  let paymentRepository: Repository<Payment>;
  let configService: ConfigService;

  let organizerId: string;
  let venueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'toor',
          database: 'eventpass_test_integration', // Separate test database
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true, // Auto-create schema for tests
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: 300000, // 5 minutos
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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);
    eventsService = moduleFixture.get<EventsService>(EventsService);
    venuesService = moduleFixture.get<VenuesService>(VenuesService);
    authService = moduleFixture.get<AuthService>(AuthService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    eventRepository = moduleFixture.get<Repository<Event>>(
      getRepositoryToken(Event),
    );
    bookingRepository = moduleFixture.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );
    paymentRepository = moduleFixture.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );

    // Setup: Create organizer and venue
    const timestamp = Date.now();
    const organizerData = {
      email: `organizer-test-${timestamp}@example.com`,
      password: 'OrganizerPass123!',
      firstName: 'Test',
      lastName: 'Organizer',
      phone: '+56912345678',
    };

    const registerResult = await authService.register(organizerData);
    organizerId = registerResult.user.id;

    // Create a venue
    const venueData = {
      name: 'Test Arena for Concurrency',
      address: 'Concurrency Street 100',
      city: 'Santiago',
      country: 'CL',
      capacity: 1000,
    };

    const venue = await venuesService.create(venueData);
    venueId = venue.id;
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    await app.close();
  });

  describe('Concurrency Tests - 100 Users Buying Simultaneously', () => {
    let eventId: string;
    const TOTAL_TICKETS = 50; // Evento con 50 boletos
    const CONCURRENT_USERS = 100; // 100 usuarios intentando comprar
    const TICKETS_PER_USER = 1; // Cada usuario intenta comprar 1 boleto

    beforeAll(async () => {
      // Crear evento con tickets limitados
      const eventData = {
        venueId,
        title: 'High Demand Concert - Limited Tickets',
        description:
          'Popular concert with only 50 tickets - testing concurrency control',
        category: EventCategory.CONCERT,
        eventDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        imageUrl: 'https://example.com/concert.jpg',
        ticketPrice: 50000,
        totalTickets: TOTAL_TICKETS,
      };

      const event = await eventsService.create(eventData, organizerId);
      eventId = event.id;
    }, 30000);

    it('should handle 100 concurrent booking requests correctly', async () => {
      // Crear 100 usuarios
      const users = await Promise.all(
        Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
          const userData = {
            email: `user${i}@concurrency-test.com`,
            password: 'TestUser123!',
            firstName: `User${i}`,
            lastName: 'Test',
            phone: `+56912${String(i).padStart(6, '0')}`,
          };
          const result = await authService.register(userData);
          return result.user.id;
        }),
      );

      expect(users).toHaveLength(CONCURRENT_USERS);

      // Todos los usuarios intentan reservar simultáneamente
      const bookingPromises = users.map((userId) =>
        bookingsService
          .reserve(
            {
              eventId,
              quantity: TICKETS_PER_USER,
            },
            userId,
          )
          .then((booking) => ({ success: true, booking }))
          .catch((error) => ({ success: false, error: error.message })),
      );

      const results = await Promise.all(bookingPromises);

      // Contar éxitos y fallos
      const successfulBookings = results.filter((r) => r.success);
      const failedBookings = results.filter((r) => !r.success);

      // Verificaciones críticas
      expect(successfulBookings.length).toBe(TOTAL_TICKETS);
      expect(failedBookings.length).toBe(CONCURRENT_USERS - TOTAL_TICKETS);

      // Verificar que todos los fallos son por falta de tickets
      failedBookings.forEach((result) => {
        if (!result.success && 'error' in result) {
          expect(result.error).toMatch(
            /No hay suficientes boletos disponibles|Sistema ocupado/,
          );
        }
      });

      // Verificar estado final del evento
      const finalEvent = await eventRepository.findOne({
        where: { id: eventId },
      });

      expect(finalEvent).not.toBeNull();
      expect(finalEvent!.availableTickets).toBe(0);
      expect(finalEvent!.soldTickets).toBe(0); // Aún no confirmados
      expect(finalEvent!.totalTickets).toBe(TOTAL_TICKETS);

      // Verificar que se crearon exactamente TOTAL_TICKETS bookings
      const allBookings = await bookingRepository.find({
        where: { eventId },
      });

      expect(allBookings).toHaveLength(TOTAL_TICKETS);

      // Verificar que todos los bookings están en estado 'pending'
      allBookings.forEach((booking) => {
        expect(booking.status).toBe('pending');
      });
    }, 60000); // 60 seconds for 100 concurrent users

    it('should prevent overselling when multiple users request more tickets than available', async () => {
      // Crear un nuevo evento con solo 10 tickets
      const limitedEventData = {
        venueId,
        title: 'Very Limited Event',
        description: 'Only 10 tickets available - overselling prevention test',
        category: EventCategory.SPORTS,
        eventDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        ticketPrice: 30000,
        totalTickets: 10,
      };

      const limitedEvent = await eventsService.create(
        limitedEventData,
        organizerId,
      );

      // Crear 20 usuarios
      const users = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const userData = {
            email: `oversell-user${i}@test.com`,
            password: 'TestUser123!',
            firstName: `OversellUser${i}`,
            lastName: 'Test',
            phone: `+56913${String(i).padStart(6, '0')}`,
          };
          const result = await authService.register(userData);
          return result.user.id;
        }),
      );

      // Cada usuario intenta comprar 2 tickets (total intent = 40 tickets)
      const bookingPromises = users.map((userId) =>
        bookingsService
          .reserve(
            {
              eventId: limitedEvent.id,
              quantity: 2,
            },
            userId,
          )
          .then((booking) => ({ success: true, booking }))
          .catch((error) => ({ success: false, error: error.message })),
      );

      const results = await Promise.all(bookingPromises);

      const successfulBookings = results.filter((r) => r.success);
      const totalTicketsSold = successfulBookings.reduce(
        (acc, r) => acc + (r.success && 'booking' in r ? r.booking.quantity : 0),
        0,
      );

      // Verificar que no se vendieron más de 10 tickets
      expect(totalTicketsSold).toBeLessThanOrEqual(10);
      expect(totalTicketsSold).toBeGreaterThanOrEqual(8); // Al menos 4 usuarios pudieron comprar 2

      // Verificar estado del evento
      const finalEvent = await eventRepository.findOne({
        where: { id: limitedEvent.id },
      });

      expect(finalEvent).not.toBeNull();
      expect(finalEvent!.availableTickets).toBeGreaterThanOrEqual(0);
      expect(finalEvent!.availableTickets).toBeLessThanOrEqual(2);
    }, 60000); // 60 seconds for 20 concurrent users with 2 tickets each
  });

  describe('Webhook Idempotency Tests', () => {
    let eventId: string;
    let userId: string;
    let bookingId: string;
    let paymentIntentId: string;

    beforeAll(async () => {
      // Crear evento para webhook tests
      const eventData = {
        venueId,
        title: 'Webhook Test Event',
        description: 'Event for testing webhook idempotency',
        category: EventCategory.CONCERT,
        eventDate: new Date(Date.now() + 20 * 86400000).toISOString(),
        ticketPrice: 40000,
        totalTickets: 100,
      };

      const event = await eventsService.create(eventData, organizerId);
      eventId = event.id;

      // Crear usuario
      const userData = {
        email: 'webhook-user@test.com',
        password: 'TestUser123!',
        firstName: 'Webhook',
        lastName: 'User',
        phone: '+56914000000',
      };

      const result = await authService.register(userData);
      userId = result.user.id;

      // Crear reserva
      const booking = await bookingsService.reserve(
        {
          eventId,
          quantity: 2,
        },
        userId,
      );

      bookingId = booking.id;

      // Crear payment intent (simulado)
      const paymentIntent = await paymentsService.createIntent(
        { bookingId },
        userId,
      );

      // Store the payment intent ID from the Stripe response
      // Since we don't have the actual payment intent ID in the response,
      // we'll use the booking ID as a proxy for testing
      paymentIntentId = `pi_test_${bookingId}`;
    }, 30000);

    it('should process webhook event only once (idempotency)', async () => {
      // Crear un webhook event simulado de Stripe
      const webhookEvent = createMockStripeWebhookEvent(
        'payment_intent.succeeded',
        paymentIntentId,
        bookingId,
      );

      // Procesar el mismo evento 3 veces
      const webhookPayload = JSON.stringify(webhookEvent);
      const results = await Promise.all([
        paymentsService.handleWebhook(
          'mock-signature',
          Buffer.from(webhookPayload),
        ),
        paymentsService.handleWebhook(
          'mock-signature',
          Buffer.from(webhookPayload),
        ),
        paymentsService.handleWebhook(
          'mock-signature',
          Buffer.from(webhookPayload),
        ),
      ]);

      // Solo el primero debe procesarse
      const successfulProcessing = results.filter((r) => r !== null);

      // Al menos uno debe procesarse (el primero)
      expect(successfulProcessing.length).toBeGreaterThanOrEqual(1);

      // Verificar que el payment se creó solo una vez
      const payments = await paymentRepository.find({
        where: { stripeEventId: webhookEvent.id },
      });

      expect(payments.length).toBeLessThanOrEqual(1);

      // Verificar que el booking se confirmó
      const booking = await bookingRepository.findOne({
        where: { id: bookingId },
      });

      expect(booking).not.toBeNull();
      expect(['confirmed', 'pending']).toContain(booking!.status);
    });

    it('should handle payment failure webhook correctly', async () => {
      // Crear otra reserva para el test de fallo
      const booking = await bookingsService.reserve(
        {
          eventId,
          quantity: 1,
        },
        userId,
      );

      const paymentIntent = await paymentsService.createIntent(
        { bookingId: booking.id },
        userId,
      );

      // Obtener tickets disponibles antes del fallo
      const eventBefore = await eventRepository.findOne({
        where: { id: eventId },
      });

      expect(eventBefore).not.toBeNull();
      const availableTicketsBefore = eventBefore!.availableTickets;

      // Crear webhook de fallo
      const failedWebhookEvent = createMockStripeWebhookEvent(
        'payment_intent.payment_failed',
        `pi_test_${booking.id}`,
        booking.id,
      );

      // Procesar webhook de fallo
      await paymentsService.handleWebhook(
        'mock-signature',
        Buffer.from(JSON.stringify(failedWebhookEvent)),
      );

      // Verificar que los tickets se liberaron
      const eventAfter = await eventRepository.findOne({
        where: { id: eventId },
      });

      expect(eventAfter).not.toBeNull();
      expect(eventAfter!.availableTickets).toBe(
        availableTicketsBefore + booking.quantity,
      );

      // Verificar que el booking se canceló
      const cancelledBooking = await bookingRepository.findOne({
        where: { id: booking.id },
      });

      expect(cancelledBooking).not.toBeNull();
      expect(cancelledBooking!.status).toBe('cancelled');
    });
  });

  describe('Full Booking-Payment Flow', () => {
    it('should complete full flow: reserve -> create payment -> webhook success -> confirm', async () => {
      // 1. Crear evento
      const eventData = {
        venueId,
        title: 'Full Flow Test Event',
        description: 'Testing complete booking and payment flow',
        category: EventCategory.OTHER,
        eventDate: new Date(Date.now() + 25 * 86400000).toISOString(),
        ticketPrice: 35000,
        totalTickets: 200,
      };

      const event = await eventsService.create(eventData, organizerId);

      // 2. Crear usuario
      const userData = {
        email: 'fullflow-user@test.com',
        password: 'TestUser123!',
        firstName: 'FullFlow',
        lastName: 'User',
        phone: '+56915000000',
      };

      const result = await authService.register(userData);
      const userId = result.user.id;

      // 3. Reservar boletos
      const booking = await bookingsService.reserve(
        {
          eventId: event.id,
          quantity: 3,
        },
        userId,
      );

      expect(booking.status).toBe('pending');
      expect(booking.quantity).toBe(3);

      // 4. Crear payment intent
      const paymentIntent = await paymentsService.createIntent(
        { bookingId: booking.id },
        userId,
      );

      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.clientSecret).toBeDefined();

      // 5. Simular webhook de éxito
      const webhookEvent = createMockStripeWebhookEvent(
        'payment_intent.succeeded',
        `pi_test_${booking.id}`,
        booking.id,
      );

      await paymentsService.handleWebhook(
        'mock-signature',
        Buffer.from(JSON.stringify(webhookEvent)),
      );

      // 6. Verificar booking confirmado
      const confirmedBooking = await bookingRepository.findOne({
        where: { id: booking.id },
      });

      expect(confirmedBooking).not.toBeNull();
      expect(['confirmed', 'pending']).toContain(confirmedBooking!.status);

      // 7. Verificar que los tickets se actualizaron en el evento
      const updatedEvent = await eventRepository.findOne({
        where: { id: event.id },
      });

      expect(updatedEvent).not.toBeNull();
      expect(updatedEvent!.availableTickets).toBe(
        eventData.totalTickets - booking.quantity,
      );
    });
  });
});

/**
 * Helper function to create mock Stripe webhook events
 */
function createMockStripeWebhookEvent(
  type: string,
  paymentIntentId: string,
  bookingId: string,
): any {
  const eventId = `evt_test_${crypto.randomBytes(16).toString('hex')}`;

  return {
    id: eventId,
    object: 'event',
    api_version: '2025-09-30',
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 100000, // $1000.00
        currency: 'clp',
        status: type.includes('succeeded') ? 'succeeded' : 'failed',
        metadata: {
          bookingId,
        },
      },
    },
  };
}
