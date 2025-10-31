import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ScanResponseDto } from './dto/scan-response.dto';

/**
 * Servicio de idempotencia para prevenir escaneos duplicados
 * Usa Redis cache para almacenar las respuestas de escaneos anteriores
 */
@Injectable()
export class IdempotencyService {
  // TTL para las claves de idempotencia: 24 horas (en milisegundos)
  private readonly IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
  private readonly CACHE_PREFIX = 'idempotency:ticket-scan:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Construye la clave de cache para idempotencia
   * Combina el checkerId con la idempotency key para evitar conflictos entre checkers
   */
  private buildCacheKey(checkerId: string, idempotencyKey: string): string {
    return `${this.CACHE_PREFIX}${checkerId}:${idempotencyKey}`;
  }

  /**
   * Valida que la idempotency key tenga el formato correcto
   * Debe ser un UUID v4 o una cadena de al menos 16 caracteres alfanuméricos
   */
  validateIdempotencyKey(idempotencyKey: string | undefined): void {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency-Key header is required for scan operations',
      );
    }

    // Validar longitud mínima
    if (idempotencyKey.length < 16) {
      throw new BadRequestException(
        'Idempotency-Key must be at least 16 characters long',
      );
    }

    // Validar caracteres permitidos (alfanuméricos y guiones)
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(idempotencyKey)) {
      throw new BadRequestException(
        'Idempotency-Key must contain only alphanumeric characters, hyphens, and underscores',
      );
    }
  }

  /**
   * Busca una respuesta cacheada para una idempotency key
   * Retorna la respuesta anterior si existe, null si no existe
   */
  async getCachedResponse(
    checkerId: string,
    idempotencyKey: string,
  ): Promise<ScanResponseDto | null> {
    const cacheKey = this.buildCacheKey(checkerId, idempotencyKey);
    const cachedResponse = await this.cacheManager.get<ScanResponseDto>(cacheKey);
    return cachedResponse || null;
  }

  /**
   * Almacena una respuesta en cache con la idempotency key
   * TTL de 24 horas para permitir retry de operaciones fallidas
   */
  async cacheResponse(
    checkerId: string,
    idempotencyKey: string,
    response: ScanResponseDto,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(checkerId, idempotencyKey);
    await this.cacheManager.set(cacheKey, response, this.IDEMPOTENCY_TTL);
  }

  /**
   * Elimina una respuesta del cache (útil para testing o invalidación manual)
   */
  async invalidateKey(checkerId: string, idempotencyKey: string): Promise<void> {
    const cacheKey = this.buildCacheKey(checkerId, idempotencyKey);
    await this.cacheManager.del(cacheKey);
  }
}
