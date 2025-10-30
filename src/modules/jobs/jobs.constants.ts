/**
 * Nombres de las colas de jobs
 */
export const QUEUE_NAMES = {
  BOOKINGS: 'bookings-queue',
  EVENTS: 'events-queue',
} as const;

/**
 * Nombres de los jobs
 */
export const JOB_NAMES = {
  // Jobs de Bookings
  EXPIRE_BOOKING: 'expire-booking',
  CLEANUP_EXPIRED_BOOKINGS: 'cleanup-expired-bookings',

  // Jobs de Events
  COMPLETE_PAST_EVENTS: 'complete-past-events',
} as const;

/**
 * Configuración de prioridades de jobs
 */
export const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const;
