import { Injectable, NestMiddleware } from '@nestjs/common';
import compression from 'compression';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    compression({
      level: 6,
      threshold: 1024, // Comprimir respuestas > 1KB
    })(req, res, next);
  }
}
