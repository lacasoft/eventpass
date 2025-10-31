import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ticket } from '../../bookings/entities/ticket.entity';
import { Event } from '../../events/entities/event.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { User } from '../../users/entities/user.entity';
import { ScanStatus } from '../enums/scan-status.enum';

/**
 * Entidad que registra cada vez que un ticket es escaneado por un CHECKER
 */
@Entity('attendance_records')
@Index(['ticketId', 'eventId'])
@Index(['eventId', 'scannedAt'])
@Index(['checkerId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ticket escaneado
  @Column({ type: 'uuid' })
  @Index()
  ticketId: string;

  @ManyToOne(() => Ticket, { nullable: false, eager: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  // Evento
  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @ManyToOne(() => Event, { nullable: false, eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // Recinto donde se escaneó
  @Column({ type: 'uuid' })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, eager: true })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  // Checker que escaneó
  @Column({ type: 'uuid' })
  checkerId: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'checkerId' })
  checker: User;

  // Estado del escaneo
  @Column({
    type: 'enum',
    enum: ScanStatus,
  })
  scanStatus: ScanStatus;

  // Información adicional
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Sector (para implementación futura)
  @Column({ type: 'varchar', length: 100, nullable: true })
  sectorId: string | null;

  // Timestamp del escaneo
  @CreateDateColumn({ type: 'timestamp' })
  scannedAt: Date;
}
