import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Servicio para gestionar locks distribuidos usando Redis
 * Útil para prevenir condiciones de carrera en operaciones críticas como reservas
 */
@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private redis: Redis;

  constructor() {
    // Configuración de Redis
    // En producción, usar variables de entorno
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  /**
   * Intenta adquirir un lock distribuido
   * @param key Clave del lock
   * @param ttlMs Tiempo de vida del lock en milisegundos
   * @returns true si el lock fue adquirido, false si ya existe
   */
  async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
    try {
      // SET con NX (solo si no existe) y PX (expira en milisegundos)
      const result = await this.redis.set(`lock:${key}`, '1', 'PX', ttlMs, 'NX');

      return result === 'OK';
    } catch (error) {
      this.logger.error(`Error acquiring lock for ${key}:`, error);
      return false;
    }
  }

  /**
   * Libera un lock distribuido
   * @param key Clave del lock
   */
  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(`lock:${key}`);
    } catch (error) {
      this.logger.error(`Error releasing lock for ${key}:`, error);
    }
  }

  /**
   * Ejecuta una operación con lock automático
   * @param key Clave del lock
   * @param operation Operación a ejecutar
   * @param ttlMs Tiempo de vida del lock en milisegundos
   */
  async withLock<T>(key: string, operation: () => Promise<T>, ttlMs: number = 5000): Promise<T> {
    const lockAcquired = await this.acquireLock(key, ttlMs);

    if (!lockAcquired) {
      throw new Error(`Sistema ocupado: no se pudo adquirir lock para ${key}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(key);
    }
  }

  /**
   * Cierra la conexión de Redis
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
