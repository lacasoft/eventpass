import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../users/enums/user-role.enum';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

interface ValidatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtSecret') || 'default-secret',
    });
  }

  validate(payload: JwtPayload): Promise<ValidatedUser> {
    return Promise.resolve({
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }
}
