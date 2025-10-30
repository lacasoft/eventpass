import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the profile of the authenticated user. Available to all authenticated users.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        role: 'cliente',
        isActive: true,
        mustChangePassword: false,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getCurrentUser(@CurrentUser('sub') userId: string) {
    const user = await this.usersService.findOne(userId);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Allows authenticated users to update their own profile. Cannot change role, password, or isActive status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'updated@example.com',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+1234567890',
        role: 'cliente',
        isActive: true,
        mustChangePassword: false,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T15:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already in use' })
  async updateCurrentUser(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, updateProfileDto);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'Change current user password',
    description:
      'Allows authenticated users to change their own password. Requires current password verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'Password updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - New password does not meet requirements',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'La nueva contraseña debe tener al menos 8 caracteres',
          'La nueva contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Current password is incorrect or JWT token invalid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Current password is incorrect',
        error: 'Unauthorized',
      },
    },
  })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return { message: 'Password updated successfully' };
  }
}
