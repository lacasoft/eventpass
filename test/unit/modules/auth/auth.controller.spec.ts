import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AuthController } from '../../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { LoginDto } from '../../../../src/modules/auth/dto/login.dto';
import { RegisterDto } from '../../../../src/modules/auth/dto/register.dto';
import { RefreshTokenDto } from '../../../../src/modules/auth/dto/refresh-token.dto';
import { ForgotPasswordDto } from '../../../../src/modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../../../src/modules/auth/dto/reset-password.dto';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let cacheManager: jest.Mocked<Cache>;

  const mockAuthResponse = {
    user: {
      id: 'user-uuid-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CLIENTE,
      mustChangePassword: false,
    },
    token: 'access-token-123',
    refreshToken: 'refresh-token-123',
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'StrongPass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should register a new user successfully', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);
      cacheManager.del.mockResolvedValue(undefined as any);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should invalidate users cache after registration', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);
      cacheManager.del.mockResolvedValue(undefined as any);

      await controller.register(registerDto);

      expect(cacheManager.del).toHaveBeenCalledWith('users_all');
      expect(cacheManager.del).toHaveBeenCalledWith('users:all');
      expect(cacheManager.del).toHaveBeenCalledWith('users:active');
      expect(cacheManager.del).toHaveBeenCalledWith('users:inactive');
      expect(cacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should propagate errors from auth service', async () => {
      const error = new Error('Email already exists');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow('Email already exists');
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should propagate authentication errors', async () => {
      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should propagate forbidden errors for suspended users', async () => {
      const error = new Error('User account is suspended');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('User account is suspended');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    const mockRequest = {
      user: {
        sub: 'user-uuid-123',
        email: 'test@example.com',
      },
    };

    it('should refresh tokens successfully', async () => {
      authService.refreshTokens.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshTokenDto, mockRequest);

      expect(result).toEqual(mockAuthResponse);
      expect(authService.refreshTokens).toHaveBeenCalledWith(mockRequest.user.sub, mockRequest.user.email);
      expect(authService.refreshTokens).toHaveBeenCalledTimes(1);
    });

    it('should extract userId and email from request', async () => {
      authService.refreshTokens.mockResolvedValue(mockAuthResponse);

      await controller.refresh(refreshTokenDto, mockRequest);

      expect(authService.refreshTokens).toHaveBeenCalledWith('user-uuid-123', 'test@example.com');
    });

    it('should propagate errors from auth service', async () => {
      const error = new Error('User not found');
      authService.refreshTokens.mockRejectedValue(error);

      await expect(controller.refresh(refreshTokenDto, mockRequest)).rejects.toThrow('User not found');
      expect(authService.refreshTokens).toHaveBeenCalledWith(mockRequest.user.sub, mockRequest.user.email);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    const mockForgotPasswordResponse = {
      success: true,
      message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
    };

    it('should process forgot password request successfully', async () => {
      authService.forgotPassword.mockResolvedValue(mockForgotPasswordResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(mockForgotPasswordResponse);
      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
      expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    });

    it('should return success message regardless of email existence', async () => {
      authService.forgotPassword.mockResolvedValue(mockForgotPasswordResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si existe una cuenta con ese email');
    });

    it('should propagate errors from auth service', async () => {
      const error = new Error('Email service unavailable');
      authService.forgotPassword.mockRejectedValue(error);

      await expect(controller.forgotPassword(forgotPasswordDto)).rejects.toThrow('Email service unavailable');
      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewStrongPass123!',
    };

    const mockResetPasswordResponse = {
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
    };

    it('should reset password successfully', async () => {
      authService.resetPassword.mockResolvedValue(mockResetPasswordResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(mockResetPasswordResponse);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('should return success message on valid reset', async () => {
      authService.resetPassword.mockResolvedValue(mockResetPasswordResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('contraseña ha sido restablecida exitosamente');
    });

    it('should propagate token validation errors', async () => {
      const error = new Error('Token de recuperación inválido');
      authService.resetPassword.mockRejectedValue(error);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow('Token de recuperación inválido');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });

    it('should propagate token expiration errors', async () => {
      const error = new Error('El token de recuperación ha expirado');
      authService.resetPassword.mockRejectedValue(error);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow('El token de recuperación ha expirado');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });

    it('should propagate forbidden errors for suspended users', async () => {
      const error = new Error('La cuenta está suspendida');
      authService.resetPassword.mockRejectedValue(error);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow('La cuenta está suspendida');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });
});
