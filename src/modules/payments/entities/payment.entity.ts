import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
@Index(['bookingId'])
@Index(['userId'])
@Index(['eventId'])
@Index(['stripePaymentIntentId'], { unique: true })
@Index(['status', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stripe Payment Intent ID (único y requerido)
  @Column({ type: 'varchar', length: 255, unique: true })
  stripePaymentIntentId: string;

  // Relación con Booking
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid' })
  bookingId: string;

  // Relación con User (quien realizó el pago)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // Relación con Event
  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'uuid' })
  eventId: string;

  // Detalles del pago
  @Column({ type: 'int' })
  amount: number; // Monto en centavos (ej: 11500 = $115.00)

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  // Metadata de Stripe
  @Column({ type: 'jsonb', nullable: true })
  stripeMetadata: Record<string, any>;

  // Información de error (si falla)
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode: string;

  // Timestamps de eventos de Stripe
  @Column({ type: 'timestamp', nullable: true })
  succeededAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundedAmount: number;

  // Idempotencia: evitar procesamiento duplicado de webhooks
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripeEventId: string; // ID del evento de Stripe para idempotencia

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
