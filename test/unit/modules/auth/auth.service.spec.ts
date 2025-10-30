import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { EmailService } from '../../../../src/common/email/email.service';
import { PasswordUtil } from '../../../../src/common/utils/password.util';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';
import { LoginDto } from '../../../../src/modules/auth/dto/login.dto';
import { RegisterDto } from '../../../../src/modules/auth/dto/register.dto';
import { ForgotPasswordDto } from '../../../../src/modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../../../src/modules/auth/dto/reset-password.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    role: UserRole.CLIENTE,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'app.jwtSecret': 'test-secret',
        'app.jwtExpiresIn': '1d',
        'app.jwtRefreshSecret': 'test-refresh-secret',
        'app.jwtRefreshExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordChangedConfirmation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'StrongPass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should register a new user successfully', async () => {
      const newUser = { ...mockUser, ...registerDto, id: 'new-user-id' };
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.create.mockResolvedValue(newUser as any);
      jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: UserRole.CLIENTE,
          mustChangePassword: newUser.mustChangePassword,
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.create).toHaveBeenCalledWith(
        { ...registerDto, role: UserRole.CLIENTE },
        undefined,
      );
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should always create user with CLIENTE role', async () => {
      const newUser = { ...mockUser, ...registerDto, id: 'new-user-id' };
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.create.mockResolvedValue(newUser as any);
      jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.CLIENTE }),
        undefined,
      );
    });
  });

  describe('validateUser', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return user without password when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.validateUser(loginDto);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        phone: mockUser.phone,
        role: mockUser.role,
        isActive: mockUser.isActive,
        mustChangePassword: mockUser.mustChangePassword,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
      });
      expect(result).not.toHaveProperty('password');
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should return null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);

      const result = await service.validateUser(loginDto);

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'comparePassword').mockResolvedValue(false);

      const result = await service.validateUser(loginDto);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const { password, ...userWithoutPassword } = mockUser;

      jest.spyOn(service, 'validateUser').mockResolvedValue(userWithoutPassword);
      jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          mustChangePassword: mockUser.mustChangePassword,
        },
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null as any);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw ForbiddenException when user is suspended', async () => {
      const { password, ...suspendedUser } = { ...mockUser, isActive: false };

      jest.spyOn(service, 'validateUser').mockResolvedValue(suspendedUser as any);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
      await expect(service.login(loginDto)).rejects.toThrow('User account is suspended');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    const userId = 'user-uuid-123';
    const email = 'test@example.com';

    it('should refresh tokens successfully', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens(userId, email);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          mustChangePassword: mockUser.mustChangePassword,
        },
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findOne.mockResolvedValue(null as any);

      await expect(service.refreshTokens(userId, email)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens(userId, email)).rejects.toThrow('User not found');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is suspended', async () => {
      const suspendedUser = { ...mockUser, isActive: false };
      usersService.findOne.mockResolvedValue(suspendedUser as any);

      await expect(service.refreshTokens(userId, email)).rejects.toThrow(ForbiddenException);
      await expect(service.refreshTokens(userId, email)).rejects.toThrow('User account is suspended');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email when user exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('reset-token-123');
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          type: 'password-reset',
        },
        {
          secret: 'test-secret',
          expiresIn: '1h',
        },
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        'reset-token-123',
        'John Doe',
      );
    });

    it('should return success message when user does not exist (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.',
      });
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should generate JWT with 1 hour expiration', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('reset-token-123');
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword(forgotPasswordDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'password-reset' }),
        expect.objectContaining({ expiresIn: '1h' }),
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewStrongPass123!',
    };

    it('should reset password successfully', async () => {
      const tokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'password-reset',
      };

      jwtService.verifyAsync.mockResolvedValue(tokenPayload);
      usersService.findOne.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'hashPassword').mockResolvedValue('new-hashed-password');
      usersService.updatePassword.mockResolvedValue(undefined);
      emailService.sendPasswordChangedConfirmation.mockResolvedValue(undefined);

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toEqual({
        success: true,
        message: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(resetPasswordDto.token, {
        secret: 'test-secret',
      });
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(usersService.updatePassword).toHaveBeenCalledWith(mockUser.id, 'new-hashed-password');
      expect(emailService.sendPasswordChangedConfirmation).toHaveBeenCalledWith(
        mockUser.email,
        'John Doe',
      );
    });

    it('should throw BadRequestException when token is invalid', async () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('Token de recuperación inválido');
    });

    it('should throw BadRequestException when token is expired', async () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwtService.verifyAsync.mockRejectedValue(error);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('El token de recuperación ha expirado');
    });

    it('should throw BadRequestException when token type is not password-reset', async () => {
      const tokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'email-verification', // Wrong type
      };

      jwtService.verifyAsync.mockResolvedValue(tokenPayload);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('Token de recuperación inválido');
    });

    it('should throw BadRequestException when user not found', async () => {
      const tokenPayload = {
        userId: 'non-existent-user',
        email: 'ghost@example.com',
        type: 'password-reset',
      };

      jwtService.verifyAsync.mockResolvedValue(tokenPayload);
      usersService.findOne.mockResolvedValue(null as any);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('Usuario no encontrado');
    });

    it('should throw ForbiddenException when user is suspended', async () => {
      const tokenPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        type: 'password-reset',
      };
      const suspendedUser = { ...mockUser, isActive: false };

      jwtService.verifyAsync.mockResolvedValue(tokenPayload);
      usersService.findOne.mockResolvedValue(suspendedUser as any);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(ForbiddenException);
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('La cuenta está suspendida');
    });
  });
});
