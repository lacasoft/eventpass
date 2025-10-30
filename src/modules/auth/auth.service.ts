import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { UserWithoutPassword } from '../../shared/interfaces/user.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Validar que el email no exista
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Crear usuario con rol CLIENTE (no se puede especificar rol en registro)
    const user = await this.usersService.create(
      {
        ...registerDto,
        role: UserRole.CLIENTE, // Siempre es cliente en auto-registro
      },
      undefined, // No hay usuario actual en registro público
    );

    // Generar tokens
    const tokens = await this.getTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  async validateUser(loginDto: LoginDto): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (user && (await PasswordUtil.comparePassword(loginDto.password, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar si el usuario está suspendido
    if (!user.isActive) {
      throw new ForbiddenException('User account is suspended');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  async refreshTokens(userId: string, email: string) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verificar si el usuario está suspendido
    if (!user.isActive) {
      throw new ForbiddenException('User account is suspended');
    }

    const tokens = await this.getTokens(userId, email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  private async getTokens(userId: string, email: string, role: UserRole) {
    const payload = {
      email: email,
      sub: userId,
      role: role,
    };

    // Obtener configuraciones con valores por defecto y tipado correcto
    const jwtSecret = this.configService.get<string>('app.jwtSecret') || 'super-secret-key';
    const jwtExpiresIn = (this.configService.get<string>('app.jwtExpiresIn') ||
      '1d') as StringValue;
    const jwtRefreshSecret =
      this.configService.get<string>('app.jwtRefreshSecret') || 'super-refresh-secret-key';
    const jwtRefreshExpiresIn = (this.configService.get<string>('app.jwtRefreshExpiresIn') ||
      '7d') as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: jwtExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: jwtRefreshExpiresIn,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Solicitar recuperación de contraseña
   * Siempre retorna success (security best practice - no revelar si el email existe)
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Buscar usuario
    const user = await this.usersService.findByEmail(email);

    // Siempre retornar success (security best practice - no revelar si el email existe)
    if (!user) {
      return {
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
      };
    }

    // Generar reset token (JWT con 1 hora de expiración)
    const resetToken = await this.jwtService.signAsync(
      {
        userId: user.id,
        email: user.email,
        type: 'password-reset',
      },
      {
        secret: this.configService.get<string>('app.jwtSecret') || 'super-secret-key',
        expiresIn: '1h',
      },
    );

    // Enviar email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      `${user.firstName} ${user.lastName}`,
    );

    return {
      success: true,
      message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
    };
  }

  /**
   * Restablecer contraseña usando token de recuperación
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    try {
      // Verificar y decodificar token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwtSecret') || 'super-secret-key',
      });

      // Validar que sea un token de reset
      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Token de recuperación inválido');
      }

      // Buscar usuario
      const user = await this.usersService.findOne(payload.userId);

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      // Verificar si el usuario está suspendido
      if (!user.isActive) {
        throw new ForbiddenException('La cuenta está suspendida');
      }

      // Hash nueva contraseña
      const hashedPassword = await PasswordUtil.hashPassword(newPassword);

      // Actualizar contraseña directamente en el repositorio
      await this.usersService.updatePassword(user.id, hashedPassword);

      // Enviar email de confirmación
      await this.emailService.sendPasswordChangedConfirmation(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );

      return {
        success: true,
        message:
          'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException(
          'El token de recuperación ha expirado. Por favor, solicita un nuevo enlace de recuperación.',
        );
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Token de recuperación inválido');
      }
      throw error;
    }
  }
}
