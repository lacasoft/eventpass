import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RefreshPayload } from '../../../shared/interfaces/refresh-payload.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      secretOrKey: configService.get<string>('app.jwtRefreshSecret') || 'default-refresh-secret',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshPayload): RefreshPayload {
    const refreshToken = (req.body as { refresh_token?: string }).refresh_token;
    return { ...payload, refreshToken };
  }
}
