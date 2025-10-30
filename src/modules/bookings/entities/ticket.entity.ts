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
import { Booking } from './booking.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';
import { TicketStatus } from '../enums/ticket-status.enum';

@Entity('tickets')
@Index(['bookingId', 'status'])
@Index(['eventId', 'status'])
@Index(['userId'])
@Index(['ticketCode'], { unique: true })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticketCode: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.VALID,
  })
  status: TicketStatus;

  // Relations
  @ManyToOne(() => Booking, (booking) => booking.tickets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // Usage tracking
  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  usedBy: string; // Staff member who scanned the ticket

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
