import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevenir MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');

    // X-Powered-By (ocultar tecnología)
    res.removeHeader('X-Powered-By');

    next();
  }
}
