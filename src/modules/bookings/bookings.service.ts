import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MyBookingsQueryDto } from './dto/my-bookings-query.dto';
import { BookingDetailResponseDto } from './dto/booking-detail-response.dto';
import { BookingStatus } from './enums/booking-status.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { ConfirmBookingResponseDto } from './dto/confirm-booking-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { RedisLockService } from '../../common/redis/redis-lock.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class BookingsService {
  // Tarifa de servicio: 15% del subtotal
  private readonly SERVICE_FEE_PERCENTAGE = 0.15;
  // Tiempo de expiración de reserva: 10 minutos
  private readonly RESERVATION_EXPIRY_MINUTES = 10;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly redisLockService: RedisLockService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Crear una reserva temporal de boletos
   * Implementa:
   * - Lock distribuido en Redis
   * - Transacción con nivel SERIALIZABLE
   * - Pessimistic locking (FOR UPDATE)
   * - Validación de disponibilidad
   * - Cálculo automático de precios
   */
  async reserve(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const { eventId, quantity } = createBookingDto;

    // 1. Adquirir lock distribuido en Redis (5 segundos)
    const lockKey = `booking:event:${eventId}`;

    return this.redisLockService.withLock(
      lockKey,
      async () => {
        // 2. Iniciar transacción con nivel SERIALIZABLE
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('SERIALIZABLE');

        try {
          // 3. Obtener evento con lock pesimista (FOR UPDATE)
          const event = await queryRunner.manager
            .createQueryBuilder(Event, 'event')
            .innerJoinAndSelect('event.venue', 'venue')
            .where('event.id = :eventId', { eventId })
            .setLock('pessimistic_write') // FOR UPDATE
            .getOne();

          if (!event) {
            throw new NotFoundException('Evento no encontrado');
          }

          // 4. Validar que el evento esté activo y no cancelado
          if (!event.isActive || event.isCancelled) {
            throw new BadRequestException('El evento no está disponible para reservas');
          }

          // 5. Validar que el evento sea en el futuro
          if (event.eventDate < new Date()) {
            throw new BadRequestException('El evento ya finalizó');
          }

          // 6. Verificar disponibilidad de boletos
          if (event.availableTickets < quantity) {
            throw new BadRequestException(
              `No hay suficientes boletos disponibles. Disponibles: ${event.availableTickets}, Solicitados: ${quantity}`,
            );
          }

          // 7. Calcular precios
          const unitPrice = Number(event.ticketPrice);
          const subtotal = unitPrice * quantity;
          const serviceFee = subtotal * this.SERVICE_FEE_PERCENTAGE;
          const total = subtotal + serviceFee;

          // 8. Calcular fecha de expiración (ahora + 10 minutos)
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + this.RESERVATION_EXPIRY_MINUTES);

          // 9. Decrementar availableTickets del evento
          await queryRunner.manager.update(
            Event,
            { id: eventId },
            {
              availableTickets: () => `"availableTickets" - ${quantity}`,
            },
          );

          // 10. Crear la reserva con status PENDING
          const booking = queryRunner.manager.create(Booking, {
            userId,
            eventId,
            quantity,
            unitPrice,
            subtotal,
            serviceFee,
            total,
            status: BookingStatus.PENDING,
            expiresAt,
            stripePaymentIntentId: null,
            stripeClientSecret: null,
            confirmedAt: null,
            cancelledAt: null,
            cancellationReason: null,
          });

          const savedBooking = await queryRunner.manager.save(Booking, booking);

          // 11. Commit de la transacción
          await queryRunner.commitTransaction();

          // 12. Recargar el booking con la relación event completa
          const completeBooking = await this.bookingRepository.findOne({
            where: { id: savedBooking.id },
            relations: ['event', 'event.venue'],
          });

          // 13. Programar job de expiración automática
          await this.jobsService.scheduleBookingExpiration(savedBooking.id);

          return completeBooking!;
        } catch (error) {
          // Rollback en caso de error
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          // Liberar el query runner
          await queryRunner.release();
        }
      },
      5000, // 5 segundos de lock
    );
  }

  /**
   * Obtener una reserva por ID con todos los detalles
   * Autorización: Owner del booking, admin, super_admin
   */
  async findOne(id: string, userId: string, userRole?: string): Promise<BookingDetailResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['event', 'event.venue', 'tickets'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Validar autorización: solo owner, admin o super_admin pueden ver
    const isOwner = booking.userId === userId;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }

    // Obtener payment status si existe
    let paymentStatus: string | undefined;
    if (booking.stripePaymentIntentId) {
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: booking.stripePaymentIntentId },
      });
      paymentStatus = payment?.status;
    }

    return {
      id: booking.id,
      event: {
        id: booking.event.id,
        title: booking.event.title,
        eventDate: booking.event.eventDate,
        venue: {
          id: booking.event.venue.id,
          name: booking.event.venue.name,
          address: booking.event.venue.address,
          city: booking.event.venue.city,
        },
      },
      quantity: booking.quantity,
      unitPrice: Number(booking.unitPrice),
      subtotal: Number(booking.subtotal),
      serviceFee: Number(booking.serviceFee),
      total: Number(booking.total),
      status: booking.status,
      paymentStatus,
      tickets: booking.tickets?.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
      })),
      createdAt: booking.createdAt,
      confirmedAt: booking.confirmedAt ?? undefined,
      expiresAt: booking.expiresAt ?? undefined,
    };
  }

  /**
   * Listar reservas del usuario con paginación y filtros
   */
  async findByUser(
    userId: string,
    query: MyBookingsQueryDto,
  ): Promise<PaginatedResponseDto<BookingDetailResponseDto>> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    // Construir query con filtros opcionales
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.event', 'event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('booking.tickets', 'tickets')
      .where('booking.userId = :userId', { userId });

    // Filtro opcional por status
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    // Paginación y ordenamiento
    queryBuilder.orderBy('booking.createdAt', 'DESC').skip(skip).take(limit);

    // Ejecutar query con count
    const [bookings, total] = await queryBuilder.getManyAndCount();

    // Obtener payment status para cada booking
    const bookingsWithPaymentStatus = await Promise.all(
      bookings.map(async (booking) => {
        let paymentStatus: string | undefined;

        if (booking.stripePaymentIntentId) {
          const payment = await this.paymentRepository.findOne({
            where: { stripePaymentIntentId: booking.stripePaymentIntentId },
          });
          paymentStatus = payment?.status;
        }

        return {
          id: booking.id,
          event: {
            id: booking.event.id,
            title: booking.event.title,
            eventDate: booking.event.eventDate,
            venue: {
              id: booking.event.venue.id,
              name: booking.event.venue.name,
              address: booking.event.venue.address,
              city: booking.event.venue.city,
            },
          },
          quantity: booking.quantity,
          unitPrice: Number(booking.unitPrice),
          subtotal: Number(booking.subtotal),
          serviceFee: Number(booking.serviceFee),
          total: Number(booking.total),
          status: booking.status,
          paymentStatus,
          tickets: booking.tickets?.map((ticket) => ({
            id: ticket.id,
            ticketCode: ticket.ticketCode,
            status: ticket.status,
          })),
          createdAt: booking.createdAt,
          confirmedAt: booking.confirmedAt ?? undefined,
          expiresAt: booking.expiresAt ?? undefined,
        };
      }),
    );

    return {
      data: bookingsWithPaymentStatus,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancelar una reserva pendiente y liberar boletos
   */
  async cancel(id: string, userId: string, reason?: string): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id, userId },
      });

      if (!booking) {
        throw new NotFoundException('Reserva no encontrada');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Solo se pueden cancelar reservas pendientes');
      }

      // Liberar los boletos de vuelta al evento
      await queryRunner.manager.update(
        Event,
        { id: booking.eventId },
        {
          availableTickets: () => `"availableTickets" + ${booking.quantity}`,
        },
      );

      // Actualizar el booking
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason || 'Cancelada por el usuario';

      const updatedBooking = await queryRunner.manager.save(booking);

      await queryRunner.commitTransaction();

      return updatedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Confirmar una reserva después del pago exitoso
   * Genera los tickets con códigos únicos
   * Este método es llamado por el webhook de Stripe
   */
  async confirm(bookingId: string, paymentIntentId: string): Promise<ConfirmBookingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Buscar la reserva
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['event', 'user'],
      });

      if (!booking) {
        throw new NotFoundException('Reserva no encontrada');
      }

      // 2. Validar que la reserva esté pendiente
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(`La reserva ya fue procesada con estado: ${booking.status}`);
      }

      // 3. Validar que no haya expirado
      if (booking.expiresAt && new Date() > booking.expiresAt) {
        throw new BadRequestException('La reserva ha expirado');
      }

      // 4. Actualizar el booking a confirmado
      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = new Date();
      booking.stripePaymentIntentId = paymentIntentId;
      booking.expiresAt = null; // Ya no expira porque está confirmada

      await queryRunner.manager.save(Booking, booking);

      // Cancelar job de expiración programado
      await this.jobsService.cancelBookingExpiration(booking.id);

      // 5. Generar tickets únicos
      const tickets: Ticket[] = [];
      const currentYear = new Date().getFullYear();

      for (let i = 0; i < booking.quantity; i++) {
        // Generar código único: TKT-YYYY-XXXXXX (6 caracteres aleatorios)
        const ticketCode = this.generateTicketCode(currentYear);

        const ticket = new Ticket();
        ticket.ticketCode = ticketCode;
        ticket.status = TicketStatus.VALID;
        ticket.bookingId = booking.id;
        ticket.eventId = booking.eventId;
        ticket.userId = booking.userId;

        tickets.push(ticket);
      }

      // 6. Guardar todos los tickets
      const savedTickets = await queryRunner.manager.save(Ticket, tickets);

      // 7. Incrementar soldTickets en el evento
      await queryRunner.manager.update(
        Event,
        { id: booking.eventId },
        {
          soldTickets: () => `"soldTickets" + ${booking.quantity}`,
        },
      );

      // 8. Commit de la transacción
      await queryRunner.commitTransaction();

      // 9. TODO: Enviar email con los tickets al usuario
      // Esto se implementará con un servicio de email (Nodemailer, SendGrid, etc.)

      // 10. Retornar respuesta formateada
      return {
        id: booking.id,
        status: booking.status,
        paymentStatus: 'succeeded',
        confirmedAt: booking.confirmedAt!,
        tickets: savedTickets.map((ticket) => ({
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
        })),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generar código único de ticket
   * Formato: TKT-YYYY-XXXXXX
   */
  private generateTicketCode(year: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }

    return `TKT-${year}-${code}`;
  }
}
