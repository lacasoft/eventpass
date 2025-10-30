/**
 * Cache TTL Constants
 * Valores en milisegundos obtenidos de variables de entorno
 */

// TTL por defecto desde .env (en milisegundos)
export const DEFAULT_CACHE_TTL = parseInt(process.env.CACHE_TTL || '300', 10) * 1000; // 5 minutos

// TTLs específicos por tipo de dato
export const CACHE_TTL = {
  // TTL corto para datos que cambian frecuentemente (1 minuto)
  SHORT: 60 * 1000, // 60,000ms = 1 minuto

  // TTL medio para datos estándar (5 minutos - default)
  MEDIUM: DEFAULT_CACHE_TTL, // 300,000ms = 5 minutos

  // TTL largo para datos que raramente cambian (1 hora)
  LONG: 60 * 60 * 1000, // 3,600,000ms = 1 hora

  // TTL extra largo para datos estáticos (24 horas)
  EXTRA_LONG: 24 * 60 * 60 * 1000, // 86,400,000ms = 24 horas
} as const;

/**
 * Cache Keys Prefixes
 * Prefijos para identificar claves de caché por módulo
 */
export const CACHE_KEYS = {
  USERS: 'users',
  AUTH: 'auth',
  EVENTS: 'events',
  VENUES: 'venues',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  ANALYTICS: 'analytics',
  HEALTH: 'health',
} as const;

/**
 * Genera una clave de caché con prefijo de módulo
 * @param module Prefijo del módulo (ej: 'users', 'events')
 * @param key Clave específica (ej: 'all', 'active', 'id:123')
 * @returns Clave completa (ej: 'users:all', 'events:featured')
 */
export function generateCacheKey(module: string, key: string): string {
  return `${module}:${key}`;
}
