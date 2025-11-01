import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { RefreshPayload } from '../../../shared/interfaces/refresh-payload.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.get<string>('app.jwtRefreshSecret') || 'default-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshPayload): Promise<RefreshPayload> {
    const refreshToken = (req.body as { refreshToken?: string }).refreshToken;

    // Verificar si el token está en la blacklist
    const isBlacklisted = await this.cacheManager.get(`blacklist:refresh:${refreshToken}`);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been invalidated. Please login again.');
    }

    // Verificar si hay una invalidación global de tokens
    if (payload.iat) {
      const globalInvalidationTimestamp = await this.cacheManager.get<number>(
        'global:token:invalidation:timestamp',
      );

      if (globalInvalidationTimestamp && payload.iat * 1000 < globalInvalidationTimestamp) {
        throw new UnauthorizedException(
          'Tu sesión ha sido invalidada por motivos de seguridad. Por favor, inicia sesión nuevamente.',
        );
      }
    }

    return { ...payload, refreshToken };
  }
}
