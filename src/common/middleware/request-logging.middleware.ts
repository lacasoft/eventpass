import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Middleware para logging de requests HTTP con información de seguridad
 * Registra: método, URL, IP, user agent, tiempo de respuesta, status code
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;

    // Capturar información de la request
    const requestInfo = {
      method,
      url: originalUrl,
      ip: this.getClientIp(req),
      userAgent: headers['user-agent'] || 'Unknown',
      referer: headers['referer'] || headers['referrer'] || 'Direct',
      correlationId: this.generateCorrelationId(),
    };

    // Agregar correlationId al request para trazabilidad
    (req as any).correlationId = requestInfo.correlationId;

    // Log de la request entrante (nivel http)
    this.logger.log('http', 'Incoming request', {
      ...requestInfo,
      timestamp: new Date().toISOString(),
    });

    // Interceptar el response
    const originalSend = res.send;
    const loggerInstance = this.logger;
    res.send = function (data: any): Response {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log de la response (nivel http)
      loggerInstance.log('http', 'Request completed', {
        ...requestInfo,
        statusCode,
        responseTime: responseTime + 'ms',
        contentLength: res.get('Content-Length') || 0,
        timestamp: new Date().toISOString(),
      });

      // Si es un error (4xx o 5xx), registrar en error.log también
      if (statusCode >= 400) {
        loggerInstance.error('HTTP Error Response', {
          ...requestInfo,
          statusCode,
          responseTime: responseTime + 'ms',
          errorType: statusCode >= 500 ? 'Server Error' : 'Client Error',
          timestamp: new Date().toISOString(),
        });
      }

      // Llamar al send original
      return originalSend.call(this, data);
    };

    next();
  }

  /**
   * Obtiene la IP real del cliente considerando proxies
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'Unknown';
  }

  /**
   * Genera un ID de correlación único para la request
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return timestamp + '-' + random;
  }
}
