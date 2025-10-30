import { SetMetadata } from '@nestjs/common';

export const THROTTLE_LOGIN_KEY = 'throttle_login';

/**
 * Decorador para aplicar rate limiting estricto a login
 * Limita a 5 intentos por minuto por IP
 */
export const ThrottleLogin = () => SetMetadata(THROTTLE_LOGIN_KEY, true);
