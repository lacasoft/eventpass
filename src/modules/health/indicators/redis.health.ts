import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Intentar escribir y leer un valor de prueba en Redis
      const testKey = 'health:check:test';
      const testValue = Date.now().toString();

      // Escribir valor de prueba
      await this.cacheManager.set(testKey, testValue, 5000); // 5 segundos TTL

      // Leer valor de prueba
      const retrievedValue = await this.cacheManager.get(testKey);

      // Verificar que el valor es correcto
      if (retrievedValue === testValue) {
        // Limpiar el valor de prueba
        await this.cacheManager.del(testKey);

        return this.getStatus(key, true, {
          message: 'Redis is up and running',
        });
      }

      throw new Error('Redis read/write test failed');
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          message: error.message || 'Redis is not available',
        }),
      );
    }
  }
}
