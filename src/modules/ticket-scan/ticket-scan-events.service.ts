import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

/**
 * Evento de actualización de ocupación
 */
export interface OccupancyUpdateEvent {
  eventId: string;
  venueId: string;
  currentOccupancy: number;
  capacity: number;
  occupancyPercentage: number;
  ticketScanned: {
    ticketId: string;
    ticketCode: string;
    checkerId: string;
    scanStatus: string;
    scannedAt: Date;
  };
}

/**
 * Servicio para emitir eventos en tiempo real de escaneos de tickets
 */
@Injectable()
export class TicketScanEventsService {
  private occupancyUpdates = new Subject<OccupancyUpdateEvent>();

  /**
   * Emite un evento de actualización de ocupación
   */
  emitOccupancyUpdate(event: OccupancyUpdateEvent): void {
    this.occupancyUpdates.next(event);
  }

  /**
   * Retorna un observable para escuchar actualizaciones de ocupación
   * Puede filtrarse por eventId
   */
  getOccupancyUpdates(eventId?: string): Observable<OccupancyUpdateEvent> {
    return new Observable((observer) => {
      const subscription = this.occupancyUpdates.subscribe((event) => {
        // Si se proporciona eventId, solo emitir eventos de ese evento
        if (!eventId || event.eventId === eventId) {
          observer.next(event);
        }
      });

      // Cleanup cuando el cliente se desconecta
      return () => {
        subscription.unsubscribe();
      };
    });
  }
}
