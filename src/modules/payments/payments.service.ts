import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bull';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';
import { BookingsService } from '../bookings/bookings.service';
import {
  EMAIL_QUEUE,
  EmailJobType,
  type EmailJobData,
} from '../../common/email/email-queue.processor';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly bookingsService: BookingsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });
  }

  /**
   * Crear Payment Intent en Stripe
   */
  async createIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ): Promise<PaymentIntentResponseDto> {
    const { bookingId } = createPaymentIntentDto;

    // 1. Buscar la reserva
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['event', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // 2. Validar que el usuario es el owner
    if (booking.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para pagar esta reserva');
    }

    // 3. Validar que la reserva esté pendiente
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`La reserva ya fue procesada con estado: ${booking.status}`);
    }

    // 4. Validar que la reserva no ha expirado
    if (booking.expiresAt && new Date() > booking.expiresAt) {
      throw new BadRequestException('La reserva ha expirado');
    }

    // 5. Convertir el total a centavos
    const amountInCents = Math.round(Number(booking.total) * 100);
    const currency = this.configService.get<string>('STRIPE_CURRENCY') || 'usd';

    // 6. Crear Payment Intent en Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: {
        bookingId: booking.id,
        userId: booking.userId,
        eventId: booking.eventId,
        quantity: booking.quantity.toString(),
      },
      description: `Boletos para ${booking.event.title}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // 7. Guardar payment_intent_id en el booking
    booking.stripePaymentIntentId = paymentIntent.id;
    booking.stripeClientSecret = paymentIntent.client_secret;
    await this.bookingRepository.save(booking);

    // 8. Crear registro de pago en BD
    const payment = this.paymentRepository.create({
      stripePaymentIntentId: paymentIntent.id,
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      amount: amountInCents,
      currency: currency,
      status: PaymentStatus.PENDING,
      stripeMetadata: paymentIntent.metadata,
    });

    await this.paymentRepository.save(payment);

    // 9. Retornar clientSecret al frontend
    return {
      clientSecret: paymentIntent.client_secret!,
      amount: amountInCents,
      currency: currency,
    };
  }

  /**
   * Manejar webhook de Stripe
   * Implementa idempotencia para evitar procesamiento duplicado
   */
  async handleWebhook(signature: string, rawBody: Buffer): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET no está configurada');
    }

    let event: Stripe.Event;

    try {
      // 1. Validar signature de Stripe
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Signature inválida');
    }

    // 2. Log del evento recibido
    this.logger.log(`Webhook recibido: ${event.type} - ${event.id}`);

    // 3. Verificar idempotencia: evitar procesar el mismo evento dos veces
    const existingPayment = await this.paymentRepository.findOne({
      where: { stripeEventId: event.id },
    });

    if (existingPayment) {
      this.logger.warn(`Evento duplicado detectado: ${event.id}. Ya fue procesado.`);
      return { received: true };
    }

    // 4. Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event);
        break;

      default:
        this.logger.log(`Evento no manejado: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Manejar pago exitoso
   */
  private async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata.bookingId;

    if (!bookingId) {
      this.logger.error(`Payment Intent ${paymentIntent.id} no tiene bookingId en metadata`);
      throw new BadRequestException('bookingId no encontrado en metadata');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Buscar el pago
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!payment) {
        throw new NotFoundException(`Pago no encontrado para Payment Intent: ${paymentIntent.id}`);
      }

      // 2. Verificar que no haya sido procesado (idempotencia a nivel de BD)
      if (payment.status === PaymentStatus.SUCCEEDED) {
        this.logger.warn(`Pago ${payment.id} ya fue procesado exitosamente. Skipping.`);
        await queryRunner.commitTransaction();
        return;
      }

      // 3. Buscar la reserva
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['event'],
      });

      if (!booking) {
        throw new NotFoundException(`Reserva no encontrada: ${bookingId}`);
      }

      // 4. Validar monto (convertir de centavos a dólares)
      const expectedAmount = Math.round(Number(booking.total) * 100);
      if (paymentIntent.amount !== expectedAmount) {
        this.logger.error(
          `Amount mismatch: esperado ${expectedAmount}, recibido ${paymentIntent.amount}`,
        );
        throw new BadRequestException('Amount mismatch');
      }

      // 5. Actualizar el pago
      payment.status = PaymentStatus.SUCCEEDED;
      payment.succeededAt = new Date();
      payment.stripeEventId = event.id; // Para idempotencia
      await queryRunner.manager.save(Payment, payment);

      // 6. Confirmar la reserva y generar tickets
      // Usamos el método del BookingsService que ya implementamos
      await queryRunner.commitTransaction();

      // Llamar al servicio de bookings para confirmar (fuera de la transacción)
      const confirmedBooking = await this.bookingsService.confirm(bookingId, paymentIntent.id);

      this.logger.log(`Pago exitoso procesado: ${payment.id} - Booking: ${bookingId}`);

      // 7. Enviar email con tickets (asíncrono con Bull Queue)
      await this.emailQueue.add(
        EmailJobType.SEND_TICKETS,
        {
          type: EmailJobType.SEND_TICKETS,
          userEmail: booking.user.email,
          userName: booking.user.firstName || booking.user.email,
          eventTitle: booking.event.title,
          eventDate: booking.event.eventDate.toLocaleString('es-MX', {
            dateStyle: 'full',
            timeStyle: 'short',
          }),
          venueName: booking.event.venue?.name || 'Por confirmar',
          venueAddress: booking.event.venue?.address || 'Por confirmar',
          quantity: booking.quantity,
          total: Number(booking.total),
          tickets: confirmedBooking.tickets,
          bookingId: booking.id,
        },
        {
          priority: 1, // Alta prioridad
          attempts: 3,
        },
      );

      this.logger.log(`Email job queued for booking ${bookingId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error procesando payment_intent.succeeded: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Manejar pago fallido
   */
  private async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // 1. Buscar el pago
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!payment) {
        this.logger.warn(`Pago no encontrado para Payment Intent fallido: ${paymentIntent.id}`);
        await queryRunner.commitTransaction();
        return;
      }

      // 2. Actualizar el pago a FAILED
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.stripeEventId = event.id;
      payment.errorMessage = paymentIntent.last_payment_error?.message || 'Pago fallido';
      payment.errorCode = paymentIntent.last_payment_error?.code || 'unknown';

      await queryRunner.manager.save(Payment, payment);

      // 3. Actualizar la reserva a FAILED
      await queryRunner.manager.update(
        Booking,
        { id: payment.bookingId },
        {
          status: BookingStatus.FAILED,
        },
      );

      // 4. Liberar los boletos de vuelta al evento
      const booking = await queryRunner.manager.findOne(Booking, {
        where: { id: payment.bookingId },
        relations: ['user', 'event'],
      });

      if (booking) {
        await queryRunner.manager.update(
          Event,
          { id: booking.eventId },
          {
            availableTickets: () => `available_tickets + ${booking.quantity}`,
          },
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Pago fallido procesado: ${payment.id} - Booking: ${payment.bookingId}`);

      // 5. Enviar email notificando el fallo (asíncrono con Bull Queue)
      if (booking) {
        await this.emailQueue.add(
          EmailJobType.SEND_PAYMENT_FAILED,
          {
            type: EmailJobType.SEND_PAYMENT_FAILED,
            userEmail: booking.user.email,
            userName: booking.user.firstName || booking.user.email,
            eventTitle: booking.event.title,
            total: Number(booking.total),
            errorMessage: payment.errorMessage || 'Error desconocido',
            bookingId: booking.id,
          },
          {
            priority: 2, // Prioridad media
            attempts: 3,
          },
        );

        this.logger.log(`Payment failed email job queued for booking ${booking.id}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error procesando payment_intent.payment_failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
