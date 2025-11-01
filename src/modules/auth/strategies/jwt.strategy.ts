import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { UserRole } from '../../users/enums/user-role.enum';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number; // issued at timestamp
}

interface ValidatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtSecret') || 'default-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<ValidatedUser> {
    // Extraer el token del header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    // Verificar si el token está en la blacklist
    if (accessToken) {
      const isBlacklisted = await this.cacheManager.get(`blacklist:access:${accessToken}`);

      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been invalidated. Please login again.');
      }
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

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
