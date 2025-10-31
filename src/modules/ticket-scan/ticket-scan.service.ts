import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Ticket } from '../bookings/entities/ticket.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Event } from '../events/entities/event.entity';
import { Venue } from '../venues/entities/venue.entity';
import { CheckerAssignment } from '../checker-assignments/entities/checker-assignment.entity';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ScanResponseDto } from './dto/scan-response.dto';
import { VenueOccupancyDto } from './dto/venue-occupancy.dto';
import { ScanStatus } from './enums/scan-status.enum';
import { TicketStatus } from '../bookings/enums/ticket-status.enum';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { SecurityAuditService, SecurityEventType } from '../../common/logger/security-audit.service';
import { TicketScanEventsService } from './ticket-scan-events.service';

@Injectable()
export class TicketScanService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(CheckerAssignment)
    private readonly assignmentRepository: Repository<CheckerAssignment>,
    private readonly securityAuditService: SecurityAuditService,
    private readonly eventsService: TicketScanEventsService,
  ) {}

  /**
   * Escanea un ticket y registra la asistencia con todas las validaciones
   */
  async scanTicket(
    scanDto: ScanTicketDto,
    checkerId: string,
  ): Promise<ScanResponseDto> {
    const { code, eventId, venueId, sectorId } = scanDto;

    // 1. Buscar el ticket por código
    const ticket = await this.ticketRepository.findOne({
      where: { ticketCode: code },
      relations: ['booking', 'event', 'user'],
    });

    if (!ticket) {
      const message = 'Ticket no encontrado o código inválido';
      this.logScanAudit(
        ScanStatus.INVALID,
        checkerId,
        code,
        eventId,
        venueId || 'N/A',
        message,
        undefined,
        sectorId,
      );
      return this.createScanResponse(
        ScanStatus.INVALID,
        message,
        new Date(),
      );
    }

    // 2. Verificar que el ticket pertenece al evento correcto
    if (ticket.eventId !== eventId) {
      const message = 'El ticket no corresponde a este evento';
      this.logScanAudit(
        ScanStatus.INVALID,
        checkerId,
        code,
        eventId,
        venueId || 'N/A',
        message,
        ticket.id,
        sectorId,
      );
      return this.createScanResponse(
        ScanStatus.INVALID,
        message,
        new Date(),
        ticket,
        ticket.booking,
      );
    }

    // 3. Verificar estado del evento
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['venue'],
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Verificar que el evento esté activo y no cancelado
    if (!event.isActive || event.isCancelled) {
      const message = 'El evento está cerrado o ha sido cancelado';
      await this.createAttendanceRecord(
        ticket.id,
        eventId,
        event.venueId,
        checkerId,
        ScanStatus.EVENT_CLOSED,
        sectorId,
      );

      this.logScanAudit(
        ScanStatus.EVENT_CLOSED,
        checkerId,
        code,
        eventId,
        event.venueId,
        message,
        ticket.id,
        sectorId,
      );

      return this.createScanResponse(
        ScanStatus.EVENT_CLOSED,
        message,
        new Date(),
        ticket,
        ticket.booking,
      );
    }

    // Verificar que el evento no haya finalizado (fecha del evento)
    const now = new Date();
    const eventDate = new Date(event.eventDate);
    const eventEndTime = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // +24 horas por defecto

    if (now > eventEndTime) {
      const message = 'El evento ya ha finalizado';
      await this.createAttendanceRecord(
        ticket.id,
        eventId,
        event.venueId,
        checkerId,
        ScanStatus.EVENT_CLOSED,
        sectorId,
      );

      this.logScanAudit(
        ScanStatus.EVENT_CLOSED,
        checkerId,
        code,
        eventId,
        event.venueId,
        message,
        ticket.id,
        sectorId,
      );

      return this.createScanResponse(
        ScanStatus.EVENT_CLOSED,
        message,
        new Date(),
        ticket,
        ticket.booking,
      );
    }

    // 4. Verificar que el checker está asignado a este evento
    const assignment = await this.assignmentRepository.findOne({
      where: {
        checkerId,
        eventId,
        isActive: true,
      },
    });

    if (!assignment) {
      const message = 'No tienes permiso para escanear tickets de este evento';
      this.logScanAudit(
        ScanStatus.NOT_ASSIGNED,
        checkerId,
        code,
        eventId,
        venueId || event.venueId,
        message,
        ticket.id,
        sectorId,
      );
      return this.createScanResponse(
        ScanStatus.NOT_ASSIGNED,
        message,
        new Date(),
        ticket,
        ticket.booking,
      );
    }

    // 5. Verificar el recinto si se proporcionó
    if (venueId) {
      if (event.venueId !== venueId) {
        const message = 'El ticket no corresponde a este recinto';
        await this.createAttendanceRecord(
          ticket.id,
          eventId,
          venueId,
          checkerId,
          ScanStatus.WRONG_VENUE,
          sectorId,
        );

        this.logScanAudit(
          ScanStatus.WRONG_VENUE,
          checkerId,
          code,
          eventId,
          venueId,
          message,
          ticket.id,
          sectorId,
        );

        return this.createScanResponse(
          ScanStatus.WRONG_VENUE,
          message,
          new Date(),
          ticket,
          ticket.booking,
        );
      }

      // Verificar que el checker está asignado a este recinto
      const venueAssignment = await this.assignmentRepository.findOne({
        where: {
          checkerId,
          eventId,
          venueId,
          isActive: true,
        },
      });

      if (!venueAssignment) {
        const message = 'No tienes permiso para escanear en este recinto';
        this.logScanAudit(
          ScanStatus.NOT_ASSIGNED,
          checkerId,
          code,
          eventId,
          venueId,
          message,
          ticket.id,
          sectorId,
        );
        return this.createScanResponse(
          ScanStatus.NOT_ASSIGNED,
          message,
          new Date(),
          ticket,
          ticket.booking,
        );
      }
    }

    // 6. Verificar estado de la reserva
    const booking = await this.bookingRepository.findOne({
      where: { id: ticket.bookingId },
    });

    if (!booking || booking.status !== BookingStatus.CONFIRMED) {
      const message = 'La reserva asociada no está confirmada';
      await this.createAttendanceRecord(
        ticket.id,
        eventId,
        venueId || event.venueId,
        checkerId,
        ScanStatus.BOOKING_CANCELLED,
        sectorId,
      );

      this.logScanAudit(
        ScanStatus.BOOKING_CANCELLED,
        checkerId,
        code,
        eventId,
        venueId || event.venueId,
        message,
        ticket.id,
        sectorId,
      );

      return this.createScanResponse(
        ScanStatus.BOOKING_CANCELLED,
        message,
        new Date(),
        ticket,
        booking || undefined,
      );
    }

    // 7. Verificar estado del ticket
    if (ticket.status === TicketStatus.CANCELLED) {
      const message = 'El ticket ha sido cancelado';
      await this.createAttendanceRecord(
        ticket.id,
        eventId,
        venueId || event.venueId,
        checkerId,
        ScanStatus.CANCELLED,
        sectorId,
      );

      this.logScanAudit(
        ScanStatus.CANCELLED,
        checkerId,
        code,
        eventId,
        venueId || event.venueId,
        message,
        ticket.id,
        sectorId,
      );

      return this.createScanResponse(
        ScanStatus.CANCELLED,
        message,
        new Date(),
        ticket,
        booking,
      );
    }

    if (ticket.status === TicketStatus.USED) {
      // Verificar si ya fue registrado previamente
      const previousScan = await this.attendanceRepository.findOne({
        where: { ticketId: ticket.id, scanStatus: ScanStatus.VALID },
        order: { scannedAt: 'DESC' },
      });

      const message = previousScan
        ? `Ticket ya utilizado el ${previousScan.scannedAt.toLocaleString()}`
        : 'El ticket ya ha sido utilizado';

      await this.createAttendanceRecord(
        ticket.id,
        eventId,
        venueId || event.venueId,
        checkerId,
        ScanStatus.ALREADY_USED,
        sectorId,
      );

      this.logScanAudit(
        ScanStatus.ALREADY_USED,
        checkerId,
        code,
        eventId,
        venueId || event.venueId,
        message,
        ticket.id,
        sectorId,
      );

      return this.createScanResponse(
        ScanStatus.ALREADY_USED,
        message,
        new Date(),
        ticket,
        booking,
      );
    }

    // 8. TODO ESTÁ BIEN - Marcar ticket como usado y registrar asistencia
    ticket.status = TicketStatus.USED;
    ticket.usedAt = new Date();
    ticket.usedBy = checkerId;
    await this.ticketRepository.save(ticket);

    const attendanceRecord = await this.createAttendanceRecord(
      ticket.id,
      eventId,
      venueId || event.venueId,
      checkerId,
      ScanStatus.VALID,
      sectorId,
    );

    const message = 'Entrada permitida. ¡Bienvenido!';
    this.logScanAudit(
      ScanStatus.VALID,
      checkerId,
      code,
      eventId,
      venueId || event.venueId,
      message,
      ticket.id,
      sectorId,
    );

    // Emitir evento en tiempo real de actualización de ocupación
    await this.emitOccupancyUpdateEvent(
      eventId,
      venueId || event.venueId,
      ticket.id,
      code,
      checkerId,
      ScanStatus.VALID,
    );

    return this.createScanResponse(
      ScanStatus.VALID,
      message,
      new Date(),
      ticket,
      booking,
      attendanceRecord,
    );
  }

  /**
   * Crea un registro de asistencia
   */
  private async createAttendanceRecord(
    ticketId: string,
    eventId: string,
    venueId: string,
    checkerId: string,
    scanStatus: ScanStatus,
    sectorId?: string,
  ): Promise<AttendanceRecord> {
    const record = this.attendanceRepository.create({
      ticketId,
      eventId,
      venueId,
      checkerId,
      scanStatus,
      sectorId,
    });

    return await this.attendanceRepository.save(record);
  }

  /**
   * Crea la respuesta del escaneo
   */
  private createScanResponse(
    status: ScanStatus,
    message: string,
    scannedAt: Date,
    ticket?: Ticket,
    booking?: Booking,
    attendanceRecord?: AttendanceRecord,
  ): ScanResponseDto {
    const response: ScanResponseDto = {
      status,
      message,
      scannedAt,
    };

    if (ticket) {
      response.ticket = {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        eventId: ticket.eventId,
        usedAt: ticket.usedAt,
      };
    }

    if (booking) {
      response.booking = {
        id: booking.id,
        quantity: booking.quantity,
        status: booking.status,
        total: booking.total,
      };
    }

    if (attendanceRecord) {
      response.attendanceRecord = attendanceRecord;
    }

    return response;
  }

  /**
   * Obtiene la ocupación de un recinto para un evento específico
   */
  async getVenueOccupancy(
    eventId: string,
    venueId: string,
  ): Promise<VenueOccupancyDto> {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
    });

    if (!venue) {
      throw new NotFoundException('Recinto no encontrado');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Contar tickets vendidos para este evento
    const ticketsSold = await this.ticketRepository.count({
      where: {
        eventId,
        status: TicketStatus.VALID,
      },
    });

    // Contar tickets usados (personas que ya ingresaron)
    const usedTickets = await this.ticketRepository.count({
      where: {
        eventId,
        status: TicketStatus.USED,
      },
    });

    // También podemos contar desde attendance_records con status VALID
    const currentOccupancy = await this.attendanceRepository.count({
      where: {
        eventId,
        venueId,
        scanStatus: ScanStatus.VALID,
      },
    });

    const occupancyPercentage = (currentOccupancy / venue.capacity) * 100;
    const attendanceRate =
      ticketsSold > 0 ? (currentOccupancy / ticketsSold) * 100 : 0;
    const availableSpaces = venue.capacity - currentOccupancy;

    return {
      venueId: venue.id,
      venueName: venue.name,
      capacity: venue.capacity,
      ticketsSold,
      currentOccupancy,
      occupancyPercentage: Math.round(occupancyPercentage * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      availableSpaces: Math.max(0, availableSpaces),
    };
  }

  /**
   * Obtiene el historial de escaneos de un checker
   */
  async getCheckerScanHistory(
    checkerId: string,
    eventId?: string,
  ): Promise<AttendanceRecord[]> {
    const where: any = { checkerId };
    if (eventId) {
      where.eventId = eventId;
    }

    return await this.attendanceRepository.find({
      where,
      order: { scannedAt: 'DESC' },
      take: 100, // Últimos 100 escaneos
    });
  }

  /**
   * Obtiene estadísticas de un evento para un checker
   */
  async getEventStats(eventId: string, checkerId: string) {
    // Verificar que el checker tiene asignación
    const assignment = await this.assignmentRepository.findOne({
      where: { checkerId, eventId, isActive: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'No tienes acceso a las estadísticas de este evento',
      );
    }

    const totalScans = await this.attendanceRepository.count({
      where: { checkerId, eventId },
    });

    const validScans = await this.attendanceRepository.count({
      where: { checkerId, eventId, scanStatus: ScanStatus.VALID },
    });

    const rejectedScans = totalScans - validScans;

    return {
      eventId,
      checkerId,
      totalScans,
      validScans,
      rejectedScans,
      successRate: totalScans > 0 ? (validScans / totalScans) * 100 : 0,
    };
  }

  /**
   * Registra el evento de escaneo en el log de auditoría
   */
  private logScanAudit(
    scanStatus: ScanStatus,
    checkerId: string,
    ticketCode: string,
    eventId: string,
    venueId: string,
    message: string,
    ticketId?: string,
    sectorId?: string,
  ): void {
    const eventTypeMap: Record<ScanStatus, SecurityEventType> = {
      [ScanStatus.VALID]: SecurityEventType.TICKET_SCAN_VALID,
      [ScanStatus.ALREADY_USED]: SecurityEventType.TICKET_SCAN_ALREADY_USED,
      [ScanStatus.INVALID]: SecurityEventType.TICKET_SCAN_INVALID,
      [ScanStatus.EVENT_CLOSED]: SecurityEventType.TICKET_SCAN_EVENT_CLOSED,
      [ScanStatus.NOT_ASSIGNED]: SecurityEventType.TICKET_SCAN_NOT_ASSIGNED,
      [ScanStatus.WRONG_VENUE]: SecurityEventType.TICKET_SCAN_WRONG_VENUE,
      [ScanStatus.WRONG_SECTOR]: SecurityEventType.TICKET_SCAN_WRONG_SECTOR,
      [ScanStatus.CANCELLED]: SecurityEventType.TICKET_SCAN_CANCELLED,
      [ScanStatus.BOOKING_CANCELLED]: SecurityEventType.TICKET_SCAN_BOOKING_CANCELLED,
    };

    const result = scanStatus === ScanStatus.VALID ? 'SUCCESS' : 'DENIED';
    const severity = scanStatus === ScanStatus.VALID ? 'LOW' :
                     scanStatus === ScanStatus.INVALID ? 'MEDIUM' : 'LOW';

    this.securityAuditService.logSecurityEvent({
      eventType: eventTypeMap[scanStatus],
      userId: checkerId,
      resource: `ticket/${ticketCode}`,
      action: 'SCAN',
      result,
      message,
      severity,
      metadata: {
        ticketId,
        ticketCode,
        eventId,
        venueId,
        sectorId,
        scanStatus,
      },
    });
  }

  /**
   * Emite un evento en tiempo real con la ocupación actualizada
   */
  private async emitOccupancyUpdateEvent(
    eventId: string,
    venueId: string,
    ticketId: string,
    ticketCode: string,
    checkerId: string,
    scanStatus: ScanStatus,
  ): Promise<void> {
    try {
      // Obtener la ocupación actual
      const venue = await this.venueRepository.findOne({
        where: { id: venueId },
      });

      if (!venue) {
        return;
      }

      const currentOccupancy = await this.attendanceRepository.count({
        where: {
          eventId,
          venueId,
          scanStatus: ScanStatus.VALID,
        },
      });

      const occupancyPercentage = (currentOccupancy / venue.capacity) * 100;

      // Emitir evento
      this.eventsService.emitOccupancyUpdate({
        eventId,
        venueId,
        currentOccupancy,
        capacity: venue.capacity,
        occupancyPercentage: Math.round(occupancyPercentage * 100) / 100,
        ticketScanned: {
          ticketId,
          ticketCode,
          checkerId,
          scanStatus,
          scannedAt: new Date(),
        },
      });
    } catch (error) {
      // No queremos que un error en la emisión de eventos rompa el flujo de escaneo
      console.error('Error emitting occupancy update event:', error);
    }
  }
}
