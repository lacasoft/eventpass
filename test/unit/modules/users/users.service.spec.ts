import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../../../../src/modules/users/users.service';
import { UserRepository } from '../../../../src/modules/users/repositories/user.repository';
import { PasswordUtil } from '../../../../src/common/utils/password.util';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';
import { UserStatus } from '../../../../src/modules/users/enums/user-status.enum';
import { CreateUserDto } from '../../../../src/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../../src/modules/users/dto/update-user.dto';
import { CreateUserByAdminDto } from '../../../../src/modules/users/dto/create-user-by-admin.dto';
import { QueryUsersDto } from '../../../../src/modules/users/dto/query-users.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+56912345678',
    role: UserRole.CLIENTE,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    deletedAt: null,
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    softDeleteUser: jest.fn(),
    restoreUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(UserRepository);

    jest.clearAllMocks();
    jest.spyOn(PasswordUtil, 'hashPassword').mockResolvedValue('hashed-password');
    jest.spyOn(PasswordUtil, 'comparePassword').mockResolvedValue(true);
    jest.spyOn(PasswordUtil, 'generateTemporaryPassword').mockReturnValue('TempPass123!');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+56987654321',
    };

    it('should create a user successfully with CLIENTE role by default', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue({ ...mockUser, ...createUserDto } as any);
      userRepository.save.mockResolvedValue({ ...mockUser, ...createUserDto } as any);

      const result = await service.create(createUserDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith(createUserDto.password);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashed-password',
        role: UserRole.CLIENTE,
      });
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should allow admin to create ORGANIZADOR user', async () => {
      const organizerDto = { ...createUserDto, role: UserRole.ORGANIZADOR };
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue({ ...mockUser, ...organizerDto } as any);
      userRepository.save.mockResolvedValue({ ...mockUser, ...organizerDto } as any);

      const result = await service.create(organizerDto, UserRole.ADMIN);

      expect(result.role).toBe(UserRole.ORGANIZADOR);
    });

    it('should throw ForbiddenException if non-admin tries to create ORGANIZADOR', async () => {
      const organizerDto = { ...createUserDto, role: UserRole.ORGANIZADOR };
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.create(organizerDto, UserRole.CLIENTE)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(organizerDto, UserRole.CLIENTE)).rejects.toThrow(
        'Only administrators can create users with roles other than CLIENTE',
      );
    });

    it('should only allow super_admin to create ADMIN users', async () => {
      const adminDto = { ...createUserDto, role: UserRole.ADMIN };
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.create(adminDto, UserRole.ADMIN)).rejects.toThrow(ForbiddenException);
      await expect(service.create(adminDto, UserRole.ADMIN)).rejects.toThrow(
        'Only super-admin can create admin users',
      );
    });

    it('should throw ForbiddenException when trying to create SUPER_ADMIN', async () => {
      const superAdminDto = { ...createUserDto, role: UserRole.SUPER_ADMIN };
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.create(superAdminDto, UserRole.SUPER_ADMIN)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(superAdminDto, UserRole.SUPER_ADMIN)).rejects.toThrow(
        'Super-admin users cannot be created through API',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2' }];
      userRepository.find.mockResolvedValue(users as any);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllWithFilters', () => {
    it('should return paginated users without filters', async () => {
      const queryDto: QueryUsersDto = { page: 1, limit: 50 };
      const users = [mockUser];
      userRepository.findAndCount.mockResolvedValue([users, 1] as any);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should filter by role', async () => {
      const queryDto: QueryUsersDto = { role: UserRole.ORGANIZADOR, page: 1, limit: 50 };
      const organizer = { ...mockUser, role: UserRole.ORGANIZADOR };
      userRepository.findAndCount.mockResolvedValue([[organizer], 1] as any);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data[0].role).toBe(UserRole.ORGANIZADOR);
    });

    it('should filter by active status', async () => {
      const queryDto: QueryUsersDto = { status: UserStatus.ACTIVE, page: 1, limit: 50 };
      userRepository.findAndCount.mockResolvedValue([[mockUser], 1] as any);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toHaveLength(1);
    });

    it('should search by email, firstName or lastName', async () => {
      const queryDto: QueryUsersDto = { search: 'john', page: 1, limit: 50 };
      userRepository.find.mockResolvedValue([mockUser] as any);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName.toLowerCase()).toContain('john');
    });

    it('should handle pagination correctly', async () => {
      const queryDto: QueryUsersDto = { page: 2, limit: 10 };
      const users = Array(5).fill(mockUser);
      userRepository.findAndCount.mockResolvedValue([users, 25] as any);

      const result = await service.findAllWithFilters(queryDto);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should return null when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue({ ...mockUser, ...updateDto } as any);

      const result = await service.update(mockUser.id, updateDto, UserRole.ADMIN);

      expect(result.firstName).toBe(updateDto.firstName);
      expect(result.lastName).toBe(updateDto.lastName);
    });

    it('should hash password when updating password', async () => {
      const updateWithPassword = { ...updateDto, password: 'NewPassword123!' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      await service.update(mockUser.id, updateWithPassword, UserRole.ADMIN);

      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('NewPassword123!');
    });

    it('should throw ForbiddenException when non-admin tries to change role', async () => {
      const updateWithRole = { role: UserRole.ORGANIZADOR };
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.update(mockUser.id, updateWithRole, UserRole.CLIENTE)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should only allow super_admin to modify admin roles', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const updateDto = { role: UserRole.ORGANIZADOR }; // Intentando cambiar el rol
      userRepository.findOne.mockResolvedValue(adminUser as any);

      await expect(service.update(adminUser.id, updateDto, UserRole.ADMIN)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(adminUser.id, updateDto, UserRole.ADMIN)).rejects.toThrow(
        'Only super-admin can modify admin roles',
      );
    });

    it('should throw ForbiddenException when trying to modify super_admin role', async () => {
      const superAdmin = { ...mockUser, role: UserRole.SUPER_ADMIN };
      const updateDto = { role: UserRole.ADMIN }; // Intentando cambiar el rol
      userRepository.findOne.mockResolvedValue(superAdmin as any);

      await expect(
        service.update(superAdmin.id, updateDto, UserRole.SUPER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(superAdmin.id, updateDto, UserRole.SUPER_ADMIN),
      ).rejects.toThrow('Super-admin role cannot be modified');
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.softDeleteUser.mockResolvedValue(undefined as any);

      await service.remove(mockUser.id, UserRole.ADMIN);

      expect(userRepository.softDeleteUser).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ForbiddenException when trying to delete super_admin', async () => {
      const superAdmin = { ...mockUser, role: UserRole.SUPER_ADMIN };
      userRepository.findOne.mockResolvedValue(superAdmin as any);

      await expect(service.remove(superAdmin.id, UserRole.SUPER_ADMIN)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(superAdmin.id, UserRole.SUPER_ADMIN)).rejects.toThrow(
        'Super-admin user cannot be deleted',
      );
    });

    it('should throw ForbiddenException when non-admin tries to delete', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.remove(mockUser.id, UserRole.CLIENTE)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should only allow super_admin to delete admin users', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      userRepository.findOne.mockResolvedValue(adminUser as any);

      await expect(service.remove(adminUser.id, UserRole.ADMIN)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(adminUser.id, UserRole.ADMIN)).rejects.toThrow(
        'Only super-admin can delete admin users',
      );
    });
  });

  describe('restore', () => {
    it('should restore deleted user successfully', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      userRepository.findOne
        .mockResolvedValueOnce(deletedUser as any)
        .mockResolvedValueOnce(mockUser as any);
      userRepository.restoreUser.mockResolvedValue(undefined);

      const result = await service.restore(mockUser.id, UserRole.ADMIN);

      expect(userRepository.restoreUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw ForbiddenException when non-admin tries to restore', async () => {
      await expect(service.restore(mockUser.id, UserRole.CLIENTE)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.restore('non-existent-id', UserRole.ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is not deleted', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.restore(mockUser.id, UserRole.ADMIN)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.restore(mockUser.id, UserRole.ADMIN)).rejects.toThrow(
        'User is not deleted',
      );
    });
  });

  describe('findByRole', () => {
    it('should return users with specific role', async () => {
      const organizers = [{ ...mockUser, role: UserRole.ORGANIZADOR }];
      userRepository.find.mockResolvedValue(organizers as any);

      const result = await service.findByRole(UserRole.ORGANIZADOR);

      expect(result).toEqual(organizers);
      expect(userRepository.find).toHaveBeenCalledWith({ where: { role: UserRole.ORGANIZADOR } });
    });
  });

  describe('activate', () => {
    it('should activate user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findOne.mockResolvedValue(inactiveUser as any);
      userRepository.save.mockResolvedValue({ ...inactiveUser, isActive: true } as any);

      const result = await service.activate(mockUser.id, UserRole.ADMIN);

      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue({ ...mockUser, isActive: false } as any);

      const result = await service.deactivate(mockUser.id, UserRole.ADMIN);

      expect(result.isActive).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.updatePassword(mockUser.id, 'new-hashed-password');

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'new-hashed-password',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePassword('non-existent-id', 'hashed')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        phone: '+56999999999',
      };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue({ ...mockUser, ...updateData } as any);

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result.firstName).toBe(updateData.firstName);
      expect(result.lastName).toBe(updateData.lastName);
      expect(result.phone).toBe(updateData.phone);
    });

    it('should update email if not in use', async () => {
      const updateData = { email: 'newemail@example.com' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.save.mockResolvedValue({ ...mockUser, ...updateData } as any);

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result.email).toBe(updateData.email);
    });

    it('should throw ConflictException if new email is already in use', async () => {
      const updateData = { email: 'existing@example.com' };
      const otherUser = { ...mockUser, id: 'other-id', email: 'existing@example.com' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.findByEmail.mockResolvedValue(otherUser as any);

      await expect(service.updateProfile(mockUser.id, updateData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateProfile(mockUser.id, updateData)).rejects.toThrow(
        'Email already in use',
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.changePassword(mockUser.id, 'CurrentPassword123!', 'NewPassword123!');

      expect(PasswordUtil.comparePassword).toHaveBeenCalledWith(
        'CurrentPassword123!',
        mockUser.password,
      );
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('NewPassword123!');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'hashed-password',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent-id', 'current', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      jest.spyOn(PasswordUtil, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, 'WrongPassword123!', 'NewPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(mockUser.id, 'WrongPassword123!', 'NewPassword123!'),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('createUserByAdmin', () => {
    const createByAdminDto: CreateUserByAdminDto = {
      email: 'organizer@example.com',
      firstName: 'New',
      lastName: 'Organizer',
      phone: '+56911111111',
      role: UserRole.ORGANIZADOR,
    };

    it('should create user with temporary password', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUserByAdmin(createByAdminDto, UserRole.SUPER_ADMIN);

      expect(result.user).toBeDefined();
      expect(result.temporaryPassword).toBe('TempPass123!');
      expect(PasswordUtil.generateTemporaryPassword).toHaveBeenCalled();
      expect(PasswordUtil.hashPassword).toHaveBeenCalledWith('TempPass123!');
    });

    it('should set mustChangePassword to true', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue({ ...mockUser, mustChangePassword: true } as any);

      const result = await service.createUserByAdmin(createByAdminDto, UserRole.SUPER_ADMIN);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mustChangePassword: true,
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.createUserByAdmin(createByAdminDto, UserRole.SUPER_ADMIN)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUserByAdmin(createByAdminDto, UserRole.SUPER_ADMIN)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should allow SUPER_ADMIN to create ORGANIZADOR', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUserByAdmin(createByAdminDto, UserRole.SUPER_ADMIN);

      expect(result.user).toBeDefined();
    });

    it('should allow SUPER_ADMIN to create ADMIN', async () => {
      const adminDto: CreateUserByAdminDto = {
        ...createByAdminDto,
        role: UserRole.ADMIN as UserRole.ADMIN
      };
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUserByAdmin(adminDto, UserRole.SUPER_ADMIN);

      expect(result.user).toBeDefined();
    });

    it('should allow SUPER_ADMIN to create CHECKER', async () => {
      const checkerDto: CreateUserByAdminDto = {
        ...createByAdminDto,
        role: UserRole.CHECKER as UserRole.CHECKER
      };
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUserByAdmin(checkerDto, UserRole.SUPER_ADMIN);

      expect(result.user).toBeDefined();
    });

    it('should allow ADMIN to create CHECKER', async () => {
      const checkerDto: CreateUserByAdminDto = {
        ...createByAdminDto,
        role: UserRole.CHECKER as UserRole.CHECKER
      };
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUserByAdmin(checkerDto, UserRole.ADMIN);

      expect(result.user).toBeDefined();
    });

    it('should throw ForbiddenException when ADMIN tries to create ORGANIZADOR', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.createUserByAdmin(createByAdminDto, UserRole.ADMIN)).rejects.toThrow(
        'Admin users can only create checker users',
      );
    });

    it('should throw ForbiddenException when ADMIN tries to create ADMIN', async () => {
      const adminDto: CreateUserByAdminDto = {
        ...createByAdminDto,
        role: UserRole.ADMIN as UserRole.ADMIN
      };
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.createUserByAdmin(adminDto, UserRole.ADMIN)).rejects.toThrow(
        'Admin users can only create checker users',
      );
    });
  });
});
