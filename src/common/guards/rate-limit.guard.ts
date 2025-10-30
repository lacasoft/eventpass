import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Considera IPs cuando está detrás de un proxy (nginx, cloudflare, etc.)
    return Promise.resolve(req.ips.length ? req.ips[0] : req.ip);
  }

  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const response = context.switchToHttp().getResponse();

    // Agregar headers de rate limit
    const ttl = this.options[0]?.ttl || 60000;
    const limit = this.options[0]?.limit || 100;

    response.header('X-RateLimit-Limit', limit);
    response.header('X-RateLimit-Remaining', 0);
    response.header('X-RateLimit-Reset', Date.now() + ttl);

    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
