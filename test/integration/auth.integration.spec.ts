import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'toor',
          database: 'eventpass_test_integration',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: 300000,
        }),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    usersService = moduleFixture.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration and Login Flow', () => {
    const testUser = {
      email: 'integration-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Integration',
      lastName: 'Test',
      phone: '+56912345678',
    };

    it('should register a new user successfully', async () => {
      const result = await authService.register(testUser);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.firstName).toBe(testUser.firstName);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUser.email);
    });

    it('should fail to register duplicate email', async () => {
      await expect(authService.register(testUser)).rejects.toThrow();
    });

    it('should fail login with wrong password', async () => {
      await expect(
        authService.login({
          email: testUser.email,
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow();
    });

    it('should refresh access token', async () => {
      const loginResult = await authService.login({
        email: testUser.email,
        password: testUser.password,
      });

      const refreshResult = await authService.refreshTokens(
        loginResult.user.id,
        loginResult.user.email,
      );

      expect(refreshResult).toHaveProperty('token');
      expect(refreshResult.token).not.toBe(loginResult.token);
    });
  });

  describe('Password Reset Flow', () => {
    const resetUser = {
      email: 'reset-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Reset',
      lastName: 'Test',
      phone: '+56912345679',
    };

    beforeAll(async () => {
      await authService.register(resetUser);
    });

    it('should generate password reset token', async () => {
      const result = await authService.forgotPassword({ email: resetUser.email });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('sent');
    });

    it('should fail forgot password for non-existent email', async () => {
      await expect(
        authService.forgotPassword({ email: 'nonexistent@example.com' }),
      ).rejects.toThrow();
    });
  });

  describe('User Profile Management', () => {
    const profileUser = {
      email: 'profile-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Profile',
      lastName: 'Test',
      phone: '+56912345680',
    };

    let userId: string;

    beforeAll(async () => {
      const result = await authService.register(profileUser);
      userId = result.user.id;
    });

    it('should get user profile', async () => {
      const user = await usersService.findOne(userId);

      expect(user.email).toBe(profileUser.email);
      expect(user.firstName).toBe(profileUser.firstName);
      expect(user).not.toHaveProperty('password');
    });

    it('should update user profile', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const result = await usersService.updateProfile(userId, updatedData);

      expect(result.firstName).toBe(updatedData.firstName);
      expect(result.lastName).toBe(updatedData.lastName);
    });

    it('should change user password', async () => {
      const newPassword = 'NewPassword123!';

      await usersService.changePassword(
        userId,
        profileUser.password,
        newPassword,
      );

      // Verify new password works
      const loginResult = await authService.login({
        email: profileUser.email,
        password: newPassword,
      });

      expect(loginResult).toHaveProperty('token');
    });
  });
});
