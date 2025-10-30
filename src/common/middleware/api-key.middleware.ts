import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    const apiSecret = req.headers['x-api-secret'] as string;

    const validApiKey = this.configService.get<string>('app.apiKey');
    const validApiSecret = this.configService.get<string>('app.apiSecret');

    if (!apiKey || !apiSecret || apiKey !== validApiKey || apiSecret !== validApiSecret) {
      throw new UnauthorizedException('Invalid API credentials');
    }

    next();
  }
}
