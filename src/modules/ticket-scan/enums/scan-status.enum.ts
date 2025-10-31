export enum ScanStatus {
  VALID = 'VALID', // Ticket válido y permitir entrada
  ALREADY_USED = 'ALREADY_USED', // Ticket ya fue usado
  INVALID = 'INVALID', // Ticket inválido o no existe
  EVENT_CLOSED = 'EVENT_CLOSED', // Evento ya cerrado o cancelado
  NOT_ASSIGNED = 'NOT_ASSIGNED', // Checker no asignado a este evento/recinto
  WRONG_VENUE = 'WRONG_VENUE', // Ticket no corresponde al recinto
  WRONG_SECTOR = 'WRONG_SECTOR', // Ticket no corresponde al sector (para futuro)
  CANCELLED = 'CANCELLED', // Ticket cancelado
  BOOKING_CANCELLED = 'BOOKING_CANCELLED', // Reserva cancelada
}
