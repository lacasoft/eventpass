import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

@ValidatorConstraint({ name: 'isNotSuperAdmin', async: false })
export class IsNotSuperAdminConstraint implements ValidatorConstraintInterface {
  validate(role: UserRole) {
    return role !== UserRole.SUPER_ADMIN;
  }

  defaultMessage() {
    return 'Cannot create users with super_admin role';
  }
}

export class CreateUserByAdminDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'organizer@example.com',
  })
  @IsEmail({}, { message: 'Email debe ser válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsString({ message: 'Nombre debe ser un texto' })
  @IsNotEmpty({ message: 'Nombre es requerido' })
  @MinLength(2, { message: 'Nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'Nombre no puede exceder 50 caracteres' })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsString({ message: 'Apellido debe ser un texto' })
  @IsNotEmpty({ message: 'Apellido es requerido' })
  @MinLength(2, { message: 'Apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'Apellido no puede exceder 50 caracteres' })
  lastName: string;

  @ApiProperty({
    description: 'Teléfono del usuario (formato internacional)',
    example: '+56912345678',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Teléfono debe ser un texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Teléfono debe estar en formato internacional válido',
  })
  phone?: string;

  @ApiProperty({
    description: 'Rol del usuario (solo organizer o admin)',
    example: 'organizer',
    enum: [UserRole.ORGANIZADOR, UserRole.ADMIN],
  })
  @IsEnum(UserRole, { message: 'Rol debe ser organizer o admin' })
  @IsNotEmpty({ message: 'Rol es requerido' })
  @Validate(IsNotSuperAdminConstraint)
  role: UserRole.ORGANIZADOR | UserRole.ADMIN;
}
