import { IsString, IsOptional, MinLength, MaxLength, Matches, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser un texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  lastName?: string;

  @ApiProperty({
    description: 'User phone number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe ser un número válido en formato internacional (ej: +1234567890)',
  })
  phone?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email?: string;
}
