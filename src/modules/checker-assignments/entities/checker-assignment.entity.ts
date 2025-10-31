import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Venue } from '../../venues/entities/venue.entity';

/**
 * Entidad que representa la asignación de un CHECKER a un recinto y evento específico.
 * Un CHECKER puede tener múltiples asignaciones (varios recintos y eventos).
 */
@Entity('checker_assignments')
@Index(['checkerId', 'venueId', 'eventId'])
@Unique(['checkerId', 'venueId', 'eventId'])
export class CheckerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con el CHECKER (User)
  @Column({ type: 'uuid' })
  @Index()
  checkerId: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  @JoinColumn({ name: 'checkerId' })
  checker: User;

  // Relación con el Recinto (Venue)
  @Column({ type: 'uuid' })
  @Index()
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, eager: true })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  // Relación con el Evento (Event)
  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @ManyToOne(() => Event, { nullable: false, eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // Usuario que creó la asignación (ADMIN o SUPER_ADMIN)
  @Column({ type: 'uuid' })
  assignedBy: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'assignedBy' })
  assignedByUser: User;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
