import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from './ticket.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Entity('bookings')
@Index(['userId', 'status'])
@Index(['eventId', 'status'])
@Index(['status', 'expiresAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con User (cliente que hace la reserva)
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Relación con Event
  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @ManyToOne(() => Event, { nullable: false, eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // Relación con Tickets
  @OneToMany(() => Ticket, (ticket) => ticket.booking, {
    cascade: true,
    eager: false,
  })
  tickets: Ticket[];

  // Detalles de la reserva
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  serviceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  // Estado y pagos
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @Index()
  status: BookingStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeClientSecret: string | null;

  // Expiración de reserva temporal (10 minutos desde creación)
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date | null;

  // Fecha de confirmación del pago
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  // Fecha de cancelación
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  // Motivo de cancelación
  @Column({ type: 'varchar', length: 500, nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
