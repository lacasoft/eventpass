import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { OrganizerDashboardDto } from './dto/organizer-dashboard.dto';
import { EventStatsDto } from './dto/event-stats.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Dashboard del organizador
   * Solo muestra eventos del organizador actual
   */
  async getOrganizerDashboard(organizerId: string): Promise<OrganizerDashboardDto> {
    // Obtener todos los eventos del organizador
    const events = await this.eventRepository.find({
      where: { organizerId },
    });

    if (events.length === 0) {
      return {
        summary: {
          totalEvents: 0,
          activeEvents: 0,
          totalTicketsSold: 0,
          grossRevenue: 0,
          netRevenue: 0,
          platformFees: 0,
        },
        events: [],
      };
    }

    const eventIds = events.map((e) => e.id);

    // Obtener todas las bookings para estos eventos
    const allBookings = await this.bookingRepository.find({
      where: { eventId: In(eventIds) },
    });

    // Obtener todos los pagos para estas bookings
    const bookingIds = allBookings.map((b) => b.id);
    const allPayments = bookingIds.length > 0
      ? await this.paymentRepository.find({
          where: { bookingId: In(bookingIds) },
        })
      : [];

    // Crear un mapa de bookingId -> payment
    const paymentMap = new Map<string, Payment>();
    allPayments.forEach((payment) => {
      paymentMap.set(payment.bookingId, payment);
    });

    // Crear un mapa de eventId -> bookings
    const bookingsByEvent = new Map<string, Booking[]>();
    allBookings.forEach((booking) => {
      const existing = bookingsByEvent.get(booking.eventId) || [];
      bookingsByEvent.set(booking.eventId, [...existing, booking]);
    });

    // Calcular resumen
    const totalEvents = events.length;
    const activeEvents = events.filter(
      (e) => e.isActive && !e.isCancelled && new Date(e.eventDate) > new Date(),
    ).length;

    let totalTicketsSold = 0;
    let grossRevenue = 0;
    let platformFees = 0;

    events.forEach((event) => {
      totalTicketsSold += event.soldTickets;

      // Obtener bookings del evento
      const eventBookings = bookingsByEvent.get(event.id) || [];

      // Calcular revenue de pagos confirmados
      const confirmedBookings = eventBookings.filter((b) => {
        const payment = paymentMap.get(b.id);
        return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
      });

      confirmedBookings.forEach((booking) => {
        grossRevenue += Number(booking.total);
        platformFees += Number(booking.serviceFee);
      });
    });

    const netRevenue = grossRevenue - platformFees;

    // Preparar datos de eventos
    const eventsData = events.map((event) => {
      const eventBookings = bookingsByEvent.get(event.id) || [];

      const confirmedBookings = eventBookings.filter((b) => {
        const payment = paymentMap.get(b.id);
        return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
      });

      const revenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total), 0);
      const occupancyRate =
        event.totalTickets > 0 ? (event.soldTickets / event.totalTickets) * 100 : 0;

      return {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        totalTickets: event.totalTickets,
        soldTickets: event.soldTickets,
        availableTickets: event.availableTickets,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        revenue: Math.round(revenue * 100) / 100,
        status: event.isActive && !event.isCancelled ? 'published' : 'cancelled',
      };
    });

    return {
      summary: {
        totalEvents,
        activeEvents,
        totalTicketsSold,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
      },
      events: eventsData,
    };
  }

  /**
   * Estadísticas de un evento específico
   * Solo el owner, admin o super_admin pueden verlas
   */
  async getEventStats(eventId: string, userId: string, userRole: UserRole): Promise<EventStatsDto> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Verificar autorización: solo el owner, admin o super_admin
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      if (event.organizerId !== userId) {
        throw new ForbiddenException('No tienes permiso para ver las estadísticas de este evento');
      }
    }

    // Obtener bookings del evento
    const bookings = await this.bookingRepository.find({
      where: { eventId },
    });

    // Obtener pagos de estas bookings
    const bookingIds = bookings.map((b) => b.id);
    const payments = bookingIds.length > 0
      ? await this.paymentRepository.find({
          where: { bookingId: In(bookingIds) },
        })
      : [];

    // Crear un mapa de bookingId -> payment
    const paymentMap = new Map<string, Payment>();
    payments.forEach((payment) => {
      paymentMap.set(payment.bookingId, payment);
    });

    // Filtrar solo bookings confirmados con pagos exitosos
    const confirmedBookings = bookings.filter((b) => {
      const payment = paymentMap.get(b.id);
      return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
    });

    const totalBookings = confirmedBookings.length;
    const totalTicketsSold = confirmedBookings.reduce((sum, b) => sum + b.quantity, 0);
    const grossRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total), 0);
    const serviceFees = confirmedBookings.reduce((sum, b) => sum + Number(b.serviceFee), 0);
    const netRevenue = grossRevenue - serviceFees;
    const averageTicketPrice = totalTicketsSold > 0 ? grossRevenue / totalTicketsSold : 0;
    const averageTicketsPerBooking = totalBookings > 0 ? totalTicketsSold / totalBookings : 0;
    const occupancyRate =
      event.totalTickets > 0 ? (totalTicketsSold / event.totalTickets) * 100 : 0;

    // Calcular ventas por día
    const salesByDate = new Map<string, { ticketsSold: number; revenue: number }>();

    confirmedBookings.forEach((booking) => {
      const dateKey = new Date(booking.createdAt).toISOString().split('T')[0];
      const existing = salesByDate.get(dateKey) || { ticketsSold: 0, revenue: 0 };
      salesByDate.set(dateKey, {
        ticketsSold: existing.ticketsSold + booking.quantity,
        revenue: existing.revenue + Number(booking.total),
      });
    });

    const salesOverTime = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        ticketsSold: data.ticketsSold,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      stats: {
        totalTickets: event.totalTickets,
        soldTickets: totalTicketsSold,
        availableTickets: event.availableTickets,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        serviceFees: Math.round(serviceFees * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        averageTicketPrice: Math.round(averageTicketPrice * 100) / 100,
        totalBookings,
        averageTicketsPerBooking: Math.round(averageTicketsPerBooking * 10) / 10,
      },
      salesOverTime,
    };
  }

  /**
   * Dashboard de administrador
   * Solo para admin y super_admin
   */
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    // Resumen de usuarios
    const [
      totalUsers,
      totalCustomers,
      totalOrganizers,
      totalAdmins,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRole.CLIENTE } }),
      this.userRepository.count({ where: { role: UserRole.ORGANIZADOR } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
    ]);

    // Resumen de eventos
    const allEvents = await this.eventRepository.find({
      relations: ['organizer'],
    });

    const totalEvents = allEvents.length;
    const activeEvents = allEvents.filter(
      (e) => e.isActive && !e.isCancelled && new Date(e.eventDate) > new Date(),
    ).length;

    // Obtener todas las bookings
    const eventIds = allEvents.map((e) => e.id);
    const allBookings = eventIds.length > 0
      ? await this.bookingRepository.find({
          where: { eventId: In(eventIds) },
        })
      : [];

    // Obtener todos los pagos
    const bookingIds = allBookings.map((b) => b.id);
    const allPayments = bookingIds.length > 0
      ? await this.paymentRepository.find({
          where: { bookingId: In(bookingIds) },
        })
      : [];

    // Crear un mapa de bookingId -> payment
    const paymentMap = new Map<string, Payment>();
    allPayments.forEach((payment) => {
      paymentMap.set(payment.bookingId, payment);
    });

    // Crear un mapa de eventId -> bookings
    const bookingsByEvent = new Map<string, Booking[]>();
    allBookings.forEach((booking) => {
      const existing = bookingsByEvent.get(booking.eventId) || [];
      bookingsByEvent.set(booking.eventId, [...existing, booking]);
    });

    // Calcular revenue total
    let totalTicketsSold = 0;
    let grossRevenue = 0;
    let platformRevenue = 0;

    allEvents.forEach((event) => {
      const eventBookings = bookingsByEvent.get(event.id) || [];

      const confirmedBookings = eventBookings.filter((b) => {
        const payment = paymentMap.get(b.id);
        return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
      });

      confirmedBookings.forEach((booking) => {
        totalTicketsSold += booking.quantity;
        grossRevenue += Number(booking.total);
        platformRevenue += Number(booking.serviceFee);
      });
    });

    // Top 5 eventos por ventas
    const eventsWithRevenue = allEvents.map((event) => {
      const eventBookings = bookingsByEvent.get(event.id) || [];

      const confirmedBookings = eventBookings.filter((b) => {
        const payment = paymentMap.get(b.id);
        return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
      });

      const soldTickets = confirmedBookings.reduce((sum, b) => sum + b.quantity, 0);
      const revenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total), 0);

      return {
        id: event.id,
        title: event.title,
        soldTickets,
        revenue,
      };
    });

    const topEvents = eventsWithRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((e) => ({
        ...e,
        revenue: Math.round(e.revenue * 100) / 100,
      }));

    // Top 5 organizadores por revenue
    const organizerStats = new Map<string, { name: string; totalEvents: number; totalRevenue: number }>();

    allEvents.forEach((event) => {
      if (!event.organizer) return;

      const eventBookings = bookingsByEvent.get(event.id) || [];

      const confirmedBookings = eventBookings.filter((b) => {
        const payment = paymentMap.get(b.id);
        return b.status === BookingStatus.CONFIRMED && payment?.status === PaymentStatus.SUCCEEDED;
      });

      const revenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total), 0);

      const existing = organizerStats.get(event.organizerId) || {
        name: `${event.organizer.firstName} ${event.organizer.lastName}`,
        totalEvents: 0,
        totalRevenue: 0,
      };

      organizerStats.set(event.organizerId, {
        name: existing.name,
        totalEvents: existing.totalEvents + 1,
        totalRevenue: existing.totalRevenue + revenue,
      });
    });

    const topOrganizers = Array.from(organizerStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalEvents: data.totalEvents,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Actividad reciente (últimas 10 bookings confirmadas)
    const recentBookings = await this.bookingRepository.find({
      where: { status: BookingStatus.CONFIRMED },
      relations: ['event', 'user'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentActivity = recentBookings.map((booking) => ({
      type: 'booking',
      description: `${booking.user?.firstName || 'Usuario'} compró ${booking.quantity} ticket(s) para ${booking.event?.title || 'un evento'}`,
      timestamp: booking.createdAt,
    }));

    return {
      summary: {
        totalUsers,
        totalCustomers,
        totalOrganizers,
        totalAdmins,
        totalEvents,
        activeEvents,
        totalTicketsSold,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        platformRevenue: Math.round(platformRevenue * 100) / 100,
      },
      topEvents,
      topOrganizers,
      recentActivity,
    };
  }
}
