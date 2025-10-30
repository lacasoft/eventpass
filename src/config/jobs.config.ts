import { registerAs } from '@nestjs/config';

export default registerAs('jobs', () => ({
  // Job: Expirar reservas individuales
  // Tiempo en minutos para expirar una reserva pendiente
  bookingExpirationTime: parseInt(process.env.BOOKING_EXPIRATION_TIME || '10', 10),

  // Job: Limpiar reservas expiradas (backup)
  // Intervalo en minutos para ejecutar el job de limpieza
  cleanupExpiredBookingsInterval: parseInt(
    process.env.CLEANUP_EXPIRED_BOOKINGS_INTERVAL || '5',
    10,
  ),

  // Job: Completar eventos pasados
  // Hora del día para ejecutar el job (formato: HH:mm)
  completePastEventsTime: process.env.COMPLETE_PAST_EVENTS_TIME || '02:00',
}));
