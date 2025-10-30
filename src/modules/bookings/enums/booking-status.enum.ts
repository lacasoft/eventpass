export enum BookingStatus {
  PENDING = 'pending', // Reserva temporal (10 min)
  CONFIRMED = 'confirmed', // Pago exitoso
  CANCELLED = 'cancelled', // Cancelada por usuario o expiración
  FAILED = 'failed', // Pago fallido
}
