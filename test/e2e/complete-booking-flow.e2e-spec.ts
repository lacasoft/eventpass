import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * End-to-End Test: Complete Booking Flow
 *
 * This test simulates the entire user journey:
 * 1. User registration
 * 2. Organizer creates venue and event
 * 3. Customer browses events
 * 4. Customer creates booking
 * 5. Customer views their bookings
 *
 * Note: Payment flow is skipped as it requires Stripe test mode setup
 */
describe('Complete Booking Flow (E2E)', () => {
  let app: INestApplication;

  // User credentials and IDs
  let customerToken: string;
  let customerId: string;
  let organizerToken: string;
  let organizerId: string;
  let venueId: string;
  let eventId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: User Registration', () => {
    const timestamp = Date.now();

    it('should register a customer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `customer-e2e-${timestamp}@test.com`,
          password: 'Customer123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+56912345678',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(`customer-e2e-${timestamp}@test.com`);

      customerToken = response.body.token;
      customerId = response.body.user.id;
    });

    it('should register an organizer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `organizer-e2e-${timestamp}@test.com`,
          password: 'Organizer123!',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+56987654321',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      organizerToken = response.body.token;
      organizerId = response.body.user.id;
    });

    it('should reject duplicate email registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `customer-e2e-${timestamp}@test.com`,
          password: 'AnotherPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
          phone: '+56911111111',
        })
        .expect(409);
    });

    it('should reject weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak-${timestamp}@test.com`,
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password',
          phone: '+56922222222',
        })
        .expect(400);
    });
  });

  describe('Step 2: Authentication', () => {
    it('should login customer with correct credentials', async () => {
      const timestamp = Date.now() - 1;
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `customer-e2e-${timestamp}@test.com`,
          password: 'Customer123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const timestamp = Date.now() - 1;
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `customer-e2e-${timestamp}@test.com`,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
        .expect(404);
    });
  });

  describe('Step 3: Organizer Creates Venue', () => {
    it('should create a venue as organizer', async () => {
      const response = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'E2E Test Arena',
          address: '123 Test Street',
          city: 'Santiago',
          country: 'CL',
          capacity: 5000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Test Arena');
      expect(response.body.capacity).toBe(5000);

      venueId = response.body.id;
    });

    it('should reject venue creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/venues')
        .send({
          name: 'Unauthorized Venue',
          address: '456 Fail St',
          city: 'Santiago',
          country: 'CL',
          capacity: 1000,
        })
        .expect(401);
    });

    it('should list all venues (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .get('/venues')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });
  });

  describe('Step 4: Organizer Creates Event', () => {
    it('should create an event as organizer', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venueId,
          title: 'E2E Rock Concert',
          description: 'An amazing rock concert for end-to-end testing',
          category: 'concert',
          eventDate: futureDate.toISOString(),
          ticketPrice: 50,
          totalTickets: 100,
          imageUrl: 'https://example.com/rock-concert.jpg',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('E2E Rock Concert');
      expect(response.body.ticketPrice).toBe(50);
      expect(response.body.totalTickets).toBe(100);
      expect(response.body.availableTickets).toBe(100);

      eventId = response.body.id;
    });

    it('should reject event creation without authentication', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await request(app.getHttpServer())
        .post('/events')
        .send({
          venueId,
          title: 'Unauthorized Event',
          description: 'This should fail',
          category: 'concert',
          eventDate: futureDate.toISOString(),
          ticketPrice: 50,
          totalTickets: 100,
        })
        .expect(401);
    });

    it('should reject event with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venueId,
          title: 'Past Event',
          description: 'This should fail - past date',
          category: 'concert',
          eventDate: pastDate.toISOString(),
          ticketPrice: 50,
          totalTickets: 100,
        })
        .expect(400);
    });
  });

  describe('Step 5: Customer Browses Events', () => {
    it('should list all published events', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);

      const event = response.body.items.find((e: any) => e.id === eventId);
      expect(event).toBeDefined();
      expect(event.title).toBe('E2E Rock Concert');
    });

    it('should filter events by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/events?category=concert')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      response.body.items.forEach((event: any) => {
        expect(event.category).toBe('concert');
      });
    });

    it('should get single event details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .expect(200);

      expect(response.body.id).toBe(eventId);
      expect(response.body.title).toBe('E2E Rock Concert');
      expect(response.body).toHaveProperty('venue');
      expect(response.body.venue.name).toBe('E2E Test Arena');
    });

    it('should return 404 for non-existent event', async () => {
      await request(app.getHttpServer())
        .get('/events/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('Step 6: Customer Creates Booking', () => {
    it('should create a booking as customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/bookings/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId,
          quantity: 2,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.eventId).toBe(eventId);
      expect(response.body.userId).toBe(customerId);
      expect(response.body.quantity).toBe(2);
      expect(response.body.status).toBe('pending');
      expect(response.body.unitPrice).toBe(50);
      expect(response.body.subtotal).toBe(100);
      expect(response.body.serviceFee).toBe(15); // 15% of subtotal
      expect(response.body.total).toBe(115);

      bookingId = response.body.id;
    });

    it('should reject booking without authentication', async () => {
      await request(app.getHttpServer())
        .post('/bookings/reserve')
        .send({
          eventId,
          quantity: 2,
        })
        .expect(401);
    });

    it('should reject booking with quantity exceeding available tickets', async () => {
      await request(app.getHttpServer())
        .post('/bookings/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId,
          quantity: 200, // More than available
        })
        .expect(400);
    });

    it('should reject booking with zero or negative quantity', async () => {
      await request(app.getHttpServer())
        .post('/bookings/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId,
          quantity: 0,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/bookings/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId,
          quantity: -5,
        })
        .expect(400);
    });
  });

  describe('Step 7: Customer Views Bookings', () => {
    it('should get booking details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.id).toBe(bookingId);
      expect(response.body.quantity).toBe(2);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event.title).toBe('E2E Rock Concert');
    });

    it('should list customer own bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);

      const booking = response.body.items.find((b: any) => b.id === bookingId);
      expect(booking).toBeDefined();
      expect(booking.quantity).toBe(2);
    });

    it('should reject viewing booking without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .expect(401);
    });

    it('should reject viewing another user booking', async () => {
      // Try to access with organizer token (different user)
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(403);
    });
  });

  describe('Step 8: Analytics (Organizer)', () => {
    it('should get organizer dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('events');
      expect(response.body.summary.totalEvents).toBeGreaterThan(0);
    });

    it('should get event statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/events/${eventId}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.event.id).toBe(eventId);
    });

    it('should reject analytics without authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .expect(401);
    });

    it('should reject customer accessing organizer dashboard', async () => {
      await request(app.getHttpServer())
        .get('/analytics/organizer/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('Step 9: Data Validation and Edge Cases', () => {
    it('should reject booking for non-existent event', async () => {
      await request(app.getHttpServer())
        .post('/bookings/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          eventId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        })
        .expect(404);
    });

    it('should reject event creation with invalid category', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venueId,
          title: 'Invalid Category Event',
          description: 'This should fail',
          category: 'invalid_category',
          eventDate: futureDate.toISOString(),
          ticketPrice: 50,
          totalTickets: 100,
        })
        .expect(400);
    });

    it('should reject venue with invalid country code', async () => {
      await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Invalid Country Venue',
          address: '789 Invalid St',
          city: 'Test City',
          country: 'INVALID',
          capacity: 1000,
        })
        .expect(400);
    });

    it('should reject negative ticket price', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          venueId,
          title: 'Negative Price Event',
          description: 'This should fail',
          category: 'concert',
          eventDate: futureDate.toISOString(),
          ticketPrice: -50,
          totalTickets: 100,
        })
        .expect(400);
    });
  });
});
