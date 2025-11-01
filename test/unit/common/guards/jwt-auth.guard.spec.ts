import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../src/common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);

    // Mock ExecutionContext
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as any;
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
    it('should return true for public routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate for protected routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivate = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
      superCanActivate.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(superCanActivate).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should call super.canActivate when no public decorator', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const superCanActivate = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
      superCanActivate.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(superCanActivate).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should check both handler and class for public decorator', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();

      mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler);
      mockExecutionContext.getClass = jest.fn().mockReturnValue(mockClass);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [mockHandler, mockClass]);
    });
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'customer' };

      const result = guard.handleRequest(null, mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no user', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, false)).toThrow('Invalid token');
    });

    it('should throw error when error provided', () => {
      const mockError = new Error('Authentication failed');

      expect(() => guard.handleRequest(mockError, null)).toThrow(mockError);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('should throw error instead of UnauthorizedException when both error and no user', () => {
      const mockError = new Error('Custom error');

      expect(() => guard.handleRequest(mockError, false)).toThrow(mockError);
    });

    it('should return user object with all properties', () => {
      const complexUser = {
        id: 'user-uuid-123',
        email: 'complex@example.com',
        role: 'organizer',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      };

      const result = guard.handleRequest(null, complexUser);

      expect(result).toEqual(complexUser);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('firstName');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined as user', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(UnauthorizedException);
    });

    it('should handle empty object as user', () => {
      const emptyUser = {};
      const result = guard.handleRequest(null, emptyUser);
      expect(result).toEqual(emptyUser);
    });

    it('should handle user with only id', () => {
      const minimalUser = { id: '123' };
      const result = guard.handleRequest(null, minimalUser);
      expect(result).toEqual(minimalUser);
    });
  });
});
