import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { EventCategory } from '../enums/event-category.enum';

@Entity('events')
@Index(['organizerId', 'eventDate'])
@Index(['category', 'eventDate'])
@Index(['eventDate'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EventCategory,
    default: EventCategory.OTHER,
  })
  category: EventCategory;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ticketPrice: number;

  @Column({ type: 'int' })
  totalTickets: number;

  @Column({ type: 'int', default: 0 })
  soldTickets: number;

  @Column({ type: 'int' })
  availableTickets: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isCancelled: boolean;

  // Relación con Organizador (User)
  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  // Relación con Venue
  @Column({ type: 'uuid' })
  @Index()
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, eager: true })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
