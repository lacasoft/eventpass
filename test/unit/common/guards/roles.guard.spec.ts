import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../../src/common/guards/roles.guard';
import { ROLES_KEY } from '../../../../src/common/decorators/roles.decorator';
import { UserRole } from '../../../../src/modules/users/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);

    // Create fresh user object for each test
    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
      },
    };

    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => mockRequest),
      })),
    } as any;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should have reflector injected', () => {
      expect(guard['reflector']).toBeDefined();
      expect(guard['reflector']).toBeInstanceOf(Reflector);
    });
  });

  describe('canActivate', () => {
    it('should return true when no roles required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = null;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user.role = UserRole.CUSTOMER;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        `User role '${UserRole.CUSTOMER}' does not have permission`,
      );
    });

    it('should return true when user has one of multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.ADMIN,
        UserRole.ORGANIZER,
        UserRole.CUSTOMER,
      ]);
      mockRequest.user.role = UserRole.ORGANIZER;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should check both handler and class for roles metadata', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();

      mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler);
      mockExecutionContext.getClass = jest.fn().mockReturnValue(mockClass);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [mockHandler, mockClass]);
    });
  });

  describe('role hierarchy', () => {
    it('should allow SUPER_ADMIN role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);
      mockRequest.user.role = UserRole.SUPER_ADMIN;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow ADMIN role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      mockRequest.user.role = UserRole.ADMIN;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow ORGANIZADOR role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ORGANIZER]);
      mockRequest.user.role = UserRole.ORGANIZER;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow CUSTOMER role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
      mockRequest.user.role = UserRole.CUSTOMER;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('error messages', () => {
    it('should include required roles in error message', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
      mockRequest.user.role = UserRole.CUSTOMER;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        `Required roles: ${UserRole.ADMIN}, ${UserRole.SUPER_ADMIN}`,
      );
    });

    it('should show single required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ORGANIZER]);
      mockRequest.user.role = UserRole.CUSTOMER;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(`Required roles: ${UserRole.ORGANIZER}`);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
      mockRequest.user = undefined;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('User not authenticated');
    });

    it('should handle empty roles array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      mockRequest.user.role = UserRole.CUSTOMER;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('should handle null roles metadata', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });


    it('should handle user with invalid role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CUSTOMER]);
      mockRequest.user.role = 'invalid-role' as UserRole;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });

  describe('multiple roles scenarios', () => {
    it('should allow when user has first role in list', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.CUSTOMER,
        UserRole.ORGANIZER,
        UserRole.ADMIN,
      ]);
      mockRequest.user.role = UserRole.CUSTOMER;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow when user has middle role in list', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.CUSTOMER,
        UserRole.ORGANIZER,
        UserRole.ADMIN,
      ]);
      mockRequest.user.role = UserRole.ORGANIZER;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow when user has last role in list', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        UserRole.CUSTOMER,
        UserRole.ORGANIZER,
        UserRole.ADMIN,
      ]);
      mockRequest.user.role = UserRole.ADMIN;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny when user has none of required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
      mockRequest.user.role = UserRole.CUSTOMER;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });
});
