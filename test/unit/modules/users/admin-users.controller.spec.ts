import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from '../../../../src/modules/users/admin-users.controller';
import { UsersService } from '../../../../src/modules/users/users.service';
import { CreateUserByAdminDto } from '../../../../src/modules/users/dto/create-user-by-admin.dto';
import { QueryUsersDto } from '../../../../src/modules/users/dto/query-users.dto';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../../../../src/modules/users/enums/user-status.enum';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let usersService: UsersService;

  const mockUsersService = {
    createUserByAdmin: jest.fn(),
    findAllWithFilters: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    restore: jest.fn(),
  };

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'organizer@example.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '+56912345678',
    role: UserRole.ORGANIZER,
    password: 'hashed_password',
    mustChangePassword: true,
    isActive: true,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUserByAdmin (POST /admin/users)', () => {
    const createDto: CreateUserByAdminDto = {
      email: 'organizer@example.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+56912345678',
      role: UserRole.ORGANIZER,
    };

    it('should create organizer user successfully', async () => {
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';
      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: mockUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN);

      expect(usersService.createUserByAdmin).toHaveBeenCalledWith(createDto, UserRole.SUPER_ADMIN);
      expect(result.user).toHaveProperty('temporaryPassword', temporaryPassword);
      expect(result.user).toHaveProperty('email', 'organizer@example.com');
      expect(result.user).toHaveProperty('role', UserRole.ORGANIZER);
      expect(result.user).toHaveProperty('mustChangePassword', true);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should create admin user successfully', async () => {
      const adminDto: CreateUserByAdminDto = {
        ...createDto,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const adminUser = { ...mockUser, email: 'admin@example.com', role: UserRole.ADMIN };
      const temporaryPassword = 'Yk8nQ3mP6vT4sZ9w';

      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: adminUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(adminDto, UserRole.SUPER_ADMIN);

      expect(usersService.createUserByAdmin).toHaveBeenCalledWith(adminDto, UserRole.SUPER_ADMIN);
      expect(result.user).toHaveProperty('role', UserRole.ADMIN);
      expect(result.user).toHaveProperty('temporaryPassword', temporaryPassword);
    });

    it('should not expose hashed password in response', async () => {
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';
      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: mockUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toHaveProperty('temporaryPassword');
    });

    it('should include temporary password in response', async () => {
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';
      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: mockUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN);

      expect(result.user.temporaryPassword).toBe(temporaryPassword);
      expect(result.user.temporaryPassword).toHaveLength(16);
    });

    it('should set mustChangePassword to true', async () => {
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';
      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: mockUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN);

      expect(result.user.mustChangePassword).toBe(true);
    });

    it('should propagate ConflictException when email exists', async () => {
      mockUsersService.createUserByAdmin.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      await expect(controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN)).rejects.toThrow(ConflictException);
      await expect(controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN)).rejects.toThrow('Email already exists');
    });

    it('should propagate service errors', async () => {
      mockUsersService.createUserByAdmin.mockRejectedValue(new Error('Database error'));

      await expect(controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN)).rejects.toThrow('Database error');
    });

    it('should return all user fields except password', async () => {
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';
      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: mockUser,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(createDto, UserRole.SUPER_ADMIN);

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('phone');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('isActive');
      expect(result.user).toHaveProperty('mustChangePassword');
      expect(result.user).toHaveProperty('createdAt');
      expect(result.user).toHaveProperty('updatedAt');
      expect(result.user).toHaveProperty('temporaryPassword');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should handle phone as optional field', async () => {
      const dtoWithoutPhone = { ...createDto };
      delete dtoWithoutPhone.phone;

      const userWithoutPhone = { ...mockUser, phone: null };
      const temporaryPassword = 'Xk9mP2nQ7wR5tY8u';

      mockUsersService.createUserByAdmin.mockResolvedValue({
        user: userWithoutPhone,
        temporaryPassword,
      });

      const result = await controller.createUserByAdmin(dtoWithoutPhone, UserRole.SUPER_ADMIN);

      expect(result.user.phone).toBeNull();
    });
  });

  describe('findAll (GET /admin/users)', () => {
    const mockUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'organizer@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+56912345678',
        role: UserRole.ORGANIZER,
        password: 'hashed_password',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        deletedAt: null,
      },
      {
        id: '660f9511-f30c-52e5-b827-557766551111',
        email: 'admin@example.com',
        firstName: 'María',
        lastName: 'González',
        phone: '+56987654321',
        role: UserRole.ADMIN,
        password: 'hashed_password',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date('2024-01-16T11:20:00Z'),
        updatedAt: new Date('2024-01-16T11:20:00Z'),
        deletedAt: null,
      },
    ];

    it('should return paginated users list', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: mockUsers,
        meta: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should not expose passwords in response', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: mockUsers,
        meta: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      result.data.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should filter by role', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
        role: UserRole.ORGANIZER,
      };

      const filteredUsers = [mockUser];

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: filteredUsers,
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe(UserRole.ORGANIZER);
    });

    it('should filter by status', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
        status: UserStatus.ACTIVE,
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: mockUsers,
        meta: {
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      result.data.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should search by email or name', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
        search: 'juan',
      };

      const searchResults = [mockUser];

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: searchResults,
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(result.data).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const queryDto: QueryUsersDto = {
        page: 2,
        limit: 1,
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: [mockUsers[1]],
        meta: {
          page: 2,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should return empty data array when no users found', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
        search: 'nonexistent',
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: [],
        meta: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should apply multiple filters simultaneously', async () => {
      const queryDto: QueryUsersDto = {
        page: 1,
        limit: 50,
        role: UserRole.ORGANIZER,
        status: UserStatus.ACTIVE,
        search: 'juan',
      };

      mockUsersService.findAllWithFilters.mockResolvedValue({
        data: [mockUser],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await controller.findAll(queryDto);

      expect(usersService.findAllWithFilters).toHaveBeenCalledWith(queryDto);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne (GET /admin/users/:id)', () => {
    it('should return user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(mockUser.email);
    });

    it('should not expose password', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(result).not.toHaveProperty('password');
    });

    it('should propagate NotFoundException', async () => {
      mockUsersService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(controller.findOne('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('update (PUT /admin/users/:id)', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateDto, UserRole.ADMIN);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateDto, UserRole.ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(result.firstName).toBe('Updated');
    });

    it('should work for super_admin', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateDto, UserRole.SUPER_ADMIN);

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        updateDto,
        UserRole.SUPER_ADMIN,
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should propagate ForbiddenException', async () => {
      mockUsersService.update.mockRejectedValue(new Error('Insufficient permissions'));

      await expect(controller.update(mockUser.id, updateDto, UserRole.ADMIN)).rejects.toThrow(
        'Insufficient permissions',
      );
    });
  });

  describe('remove (DELETE /admin/users/:id)', () => {
    it('should delete user successfully', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser.id, UserRole.ADMIN);

      expect(usersService.remove).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should work for super_admin', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser.id, UserRole.SUPER_ADMIN);

      expect(usersService.remove).toHaveBeenCalledWith(mockUser.id, UserRole.SUPER_ADMIN);
      expect(result.message).toBe('User deleted successfully');
    });

    it('should propagate errors', async () => {
      mockUsersService.remove.mockRejectedValue(new Error('User not found'));

      await expect(controller.remove('non-existent-id', UserRole.ADMIN)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('activate (PATCH /admin/users/:id/activate)', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      mockUsersService.activate.mockResolvedValue(activatedUser);

      const result = await controller.activate(mockUser.id, UserRole.ADMIN);

      expect(usersService.activate).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(result.isActive).toBe(true);
    });

    it('should work for super_admin', async () => {
      const activatedUser = { ...mockUser, isActive: true };
      mockUsersService.activate.mockResolvedValue(activatedUser);

      const result = await controller.activate(mockUser.id, UserRole.SUPER_ADMIN);

      expect(usersService.activate).toHaveBeenCalledWith(mockUser.id, UserRole.SUPER_ADMIN);
      expect(result.isActive).toBe(true);
    });

    it('should propagate errors', async () => {
      mockUsersService.activate.mockRejectedValue(new Error('User not found'));

      await expect(controller.activate('non-existent-id', UserRole.ADMIN)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('deactivate (PATCH /admin/users/:id/deactivate)', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUsersService.deactivate.mockResolvedValue(deactivatedUser);

      const result = await controller.deactivate(mockUser.id, UserRole.ADMIN);

      expect(usersService.deactivate).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(result.isActive).toBe(false);
    });

    it('should work for super_admin', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUsersService.deactivate.mockResolvedValue(deactivatedUser);

      const result = await controller.deactivate(mockUser.id, UserRole.SUPER_ADMIN);

      expect(usersService.deactivate).toHaveBeenCalledWith(mockUser.id, UserRole.SUPER_ADMIN);
      expect(result.isActive).toBe(false);
    });

    it('should propagate errors', async () => {
      mockUsersService.deactivate.mockRejectedValue(new Error('User not found'));

      await expect(controller.deactivate('non-existent-id', UserRole.ADMIN)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('restore (PATCH /admin/users/:id/restore)', () => {
    it('should restore deleted user successfully', async () => {
      const restoredUser = { ...mockUser, deletedAt: null };
      mockUsersService.restore.mockResolvedValue(restoredUser);

      const result = await controller.restore(mockUser.id, UserRole.ADMIN);

      expect(usersService.restore).toHaveBeenCalledWith(mockUser.id, UserRole.ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(result.deletedAt).toBeNull();
    });

    it('should work for super_admin', async () => {
      const restoredUser = { ...mockUser, deletedAt: null };
      mockUsersService.restore.mockResolvedValue(restoredUser);

      const result = await controller.restore(mockUser.id, UserRole.SUPER_ADMIN);

      expect(usersService.restore).toHaveBeenCalledWith(mockUser.id, UserRole.SUPER_ADMIN);
      expect(result.deletedAt).toBeNull();
    });

    it('should propagate BadRequestException when user not deleted', async () => {
      mockUsersService.restore.mockRejectedValue(new Error('User is not deleted'));

      await expect(controller.restore(mockUser.id, UserRole.ADMIN)).rejects.toThrow(
        'User is not deleted',
      );
    });

    it('should propagate errors', async () => {
      mockUsersService.restore.mockRejectedValue(new Error('User not found'));

      await expect(controller.restore('non-existent-id', UserRole.ADMIN)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
