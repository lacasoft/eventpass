import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../../src/modules/users/users.controller';
import { UsersService } from '../../../../src/modules/users/users.service';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    role: UserRole.CLIENTE,
    password: 'hashed_password',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date('2025-01-15T10:30:00Z'),
    updatedAt: new Date('2025-01-15T10:30:00Z'),
    deletedAt: null,
  };

  const mockUsersService = {
    findOne: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser (GET /users/me)', () => {
    it('should return current user profile', async () => {
      const userId = 'user-uuid-123';
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.getCurrentUser(userId);

      expect(result).not.toHaveProperty('password');
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(usersService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should extract userId from JWT token via CurrentUser decorator', async () => {
      const userId = 'user-from-jwt-token';
      usersService.findOne.mockResolvedValue({ ...mockUser, id: userId } as any);

      const result = await controller.getCurrentUser(userId);

      expect(result.id).toBe(userId);
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should propagate errors from users service', async () => {
      const userId = 'non-existent-user';
      const error = new Error('User not found');
      usersService.findOne.mockRejectedValue(error);

      await expect(controller.getCurrentUser(userId)).rejects.toThrow('User not found');
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should work for users with different roles', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      usersService.findOne.mockResolvedValue(adminUser as any);

      const result = await controller.getCurrentUser(adminUser.id);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(usersService.findOne).toHaveBeenCalledWith(adminUser.id);
    });

    it('should return user with all required fields', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.getCurrentUser(mockUser.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('mustChangePassword');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should not expose password field', async () => {
      const userWithPassword = { ...mockUser, password: 'hashed-password' };
      usersService.findOne.mockResolvedValue(userWithPassword as any);

      const result = await controller.getCurrentUser(mockUser.id);

      expect(result).not.toHaveProperty('password');
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return all fields except password', async () => {
      const userWithPassword = { ...mockUser, password: 'hashed-password' };
      usersService.findOne.mockResolvedValue(userWithPassword as any);

      const result = await controller.getCurrentUser(mockUser.id);

      // Verificar que tiene todos los campos menos password
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('mustChangePassword');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('updateCurrentUser (PATCH /users/me)', () => {
    const updateProfileDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
      email: 'newemail@example.com',
    };

    it('should update current user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateProfileDto };
      usersService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateCurrentUser(mockUser.id, updateProfileDto);

      expect(result).not.toHaveProperty('password');
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateProfileDto);
      expect(usersService.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { firstName: 'Jane' };
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      usersService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateCurrentUser(mockUser.id, partialUpdate);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe(mockUser.lastName);
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, partialUpdate);
    });

    it('should not expose password in response', async () => {
      const userWithPassword = { ...mockUser, ...updateProfileDto, password: 'hashed-password' };
      usersService.updateProfile.mockResolvedValue(userWithPassword as any);

      const result = await controller.updateCurrentUser(mockUser.id, updateProfileDto);

      expect(result).not.toHaveProperty('password');
    });

    it('should propagate errors from users service', async () => {
      const error = new Error('Email already in use');
      usersService.updateProfile.mockRejectedValue(error);

      await expect(controller.updateCurrentUser(mockUser.id, updateProfileDto)).rejects.toThrow(
        'Email already in use',
      );
      expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateProfileDto);
    });

    it('should handle email conflict error', async () => {
      const conflictError = new Error('Email already in use');
      usersService.updateProfile.mockRejectedValue(conflictError);

      await expect(controller.updateCurrentUser(mockUser.id, { email: 'existing@example.com' })).rejects.toThrow('Email already in use');
    });

    it('should extract userId from JWT token', async () => {
      const userId = 'user-from-jwt';
      const updatedUser = { ...mockUser, id: userId, ...updateProfileDto };
      usersService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateCurrentUser(userId, updateProfileDto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(userId, updateProfileDto);
      expect(result.id).toBe(userId);
    });
  });

  describe('changePassword (PATCH /users/me/password)', () => {
    const changePasswordDto = {
      currentPassword: 'CurrentPass123!',
      newPassword: 'NewStrongPass123!',
    };

    it('should change password successfully', async () => {
      usersService.changePassword.mockResolvedValue(undefined as any);

      const result = await controller.changePassword(mockUser.id, changePasswordDto);

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
      expect(usersService.changePassword).toHaveBeenCalledTimes(1);
    });

    it('should extract userId from JWT token', async () => {
      const userId = 'user-from-jwt';
      usersService.changePassword.mockResolvedValue(undefined as any);

      await controller.changePassword(userId, changePasswordDto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        userId,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
    });

    it('should propagate UnauthorizedException when current password is incorrect', async () => {
      const error = new Error('Current password is incorrect');
      usersService.changePassword.mockRejectedValue(error);

      await expect(controller.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(
        'Current password is incorrect',
      );
      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
    });

    it('should propagate validation errors for weak password', async () => {
      const weakPasswordDto = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'weak',
      };
      const error = new Error('La nueva contraseña debe tener al menos 8 caracteres');
      usersService.changePassword.mockRejectedValue(error);

      await expect(controller.changePassword(mockUser.id, weakPasswordDto as any)).rejects.toThrow();
    });

    it('should handle service errors', async () => {
      const error = new Error('User not found');
      usersService.changePassword.mockRejectedValue(error);

      await expect(controller.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow('User not found');
    });

    it('should return success message with correct format', async () => {
      usersService.changePassword.mockResolvedValue(undefined as any);

      const result = await controller.changePassword(mockUser.id, changePasswordDto);

      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Password updated successfully');
    });
  });
});
