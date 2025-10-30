/**
 * Constantes de Rate Limiting
 * Valores obtenidos de variables de entorno
 */

export const THROTTLE_TTL = parseInt(process.env.THROTTLE_TTL || '60000', 10);
export const THROTTLE_LIMIT = parseInt(process.env.THROTTLE_LIMIT || '100', 10);
export const THROTTLE_LOGIN_LIMIT = parseInt(process.env.THROTTLE_LOGIN_LIMIT || '5', 10);
export const THROTTLE_FORGOT_PASSWORD_LIMIT = parseInt(
  process.env.THROTTLE_FORGOT_PASSWORD_LIMIT || '3',
  10,
);

/**
 * Configuración de throttle para login
 * Default: 5 intentos por minuto (más estricto que el límite global)
 */
export const LOGIN_THROTTLE_CONFIG = {
  default: {
    limit: THROTTLE_LOGIN_LIMIT,
    ttl: THROTTLE_TTL,
  },
};

/**
 * Configuración de throttle para forgot password
 * Default: 3 intentos por minuto (muy restrictivo para prevenir abuse)
 */
export const FORGOT_PASSWORD_THROTTLE_CONFIG = {
  default: {
    limit: THROTTLE_FORGOT_PASSWORD_LIMIT,
    ttl: THROTTLE_TTL,
  },
};
