import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RefreshJwtAuthGuard } from '../../common/guards/refresh-jwt-auth.guard';
import { CACHE_KEYS } from '../../common/cache/cache.constants';
import {
  LOGIN_THROTTLE_CONFIG,
  FORGOT_PASSWORD_THROTTLE_CONFIG,
} from '../../common/constants/throttle.constants';
import {
  ApiLoginRateLimit,
  ApiForgotPasswordRateLimit,
} from '../../common/decorators/api-rate-limit.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user (customer role only)',
    description:
      'Public endpoint for user self-registration. All registered users have "customer" role by default.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
          mustChangePassword: false,
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Email must be a valid email address',
          'Password must be at least 8 characters long',
          'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already exists',
        error: 'Conflict',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);

    // Invalidar caché de users ya que se creó un nuevo usuario
    await this.invalidateUsersCache();

    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_THROTTLE_CONFIG) // Límite desde .env (default: 5 intentos por minuto)
  @ApiLoginRateLimit() // Document rate limiting in Swagger
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Rate limited to 5 attempts per minute per IP address to prevent brute force attacks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
          mustChangePassword: false,
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'User account is suspended',
    schema: {
      example: {
        statusCode: 403,
        message: 'User account is suspended',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
    schema: {
      example: {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
        error: 'Too Many Requests',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
          mustChangePassword: false,
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
    schema: {
      example: {
        statusCode: 401,
        message: 'User not found',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'User account is suspended',
    schema: {
      example: {
        statusCode: 403,
        message: 'User account is suspended',
        error: 'Forbidden',
      },
    },
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const userId = req.user.sub;
    const email = req.user.email;
    return this.authService.refreshTokens(userId, email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(FORGOT_PASSWORD_THROTTLE_CONFIG) // Límite desde .env (default: 3 intentos por minuto)
  @ApiForgotPasswordRateLimit() // Document rate limiting in Swagger
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description:
      'Envía un email con un enlace para restablecer la contraseña. El enlace expira en 1 hora. Por seguridad, siempre retorna éxito sin revelar si el email existe. Rate limited to 3 attempts per minute per IP to prevent abuse.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email inválido',
    schema: {
      example: {
        statusCode: 400,
        message: ['Debe proporcionar un email válido'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes de recuperación',
    schema: {
      example: {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
        error: 'Too Many Requests',
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña con token',
    description:
      'Restablece la contraseña del usuario usando el token recibido por email. El token expira en 1 hora.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
    schema: {
      example: {
        success: true,
        message:
          'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado o contraseña no válida',
    schema: {
      example: {
        statusCode: 400,
        message:
          'El token de recuperación ha expirado. Por favor, solicita un nuevo enlace de recuperación.',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario suspendido',
    schema: {
      example: {
        statusCode: 403,
        message: 'La cuenta está suspendida',
        error: 'Forbidden',
      },
    },
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidates both access token and refresh token by adding them to a blacklist. Both tokens will be immediately invalidated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        success: true,
        message: 'Logout exitoso. Tu sesión ha sido cerrada.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid token',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto);
  }

  /**
   * Invalidar caché del módulo users (cuando se registra un usuario)
   * Usa invalidación cruzada ya que auth afecta a users
   */
  private async invalidateUsersCache(): Promise<void> {
    // Invalidar claves conocidas del módulo users usando constantes
    await this.cacheManager.del('users_all'); // Retrocompatibilidad
    await this.cacheManager.del(`${CACHE_KEYS.USERS}:all`);
    await this.cacheManager.del(`${CACHE_KEYS.USERS}:active`);
    await this.cacheManager.del(`${CACHE_KEYS.USERS}:inactive`);

    // Con cache-manager v5+, eliminamos claves específicas conocidas
    // Invalidación cruzada: auth afecta al módulo users
  }
}
