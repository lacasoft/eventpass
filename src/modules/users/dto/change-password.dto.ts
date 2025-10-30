import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPass123!',
  })
  @IsString({ message: 'La contraseña actual debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character)',
    example: 'NewStrongPass123!',
    minLength: 8,
  })
  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'La nueva contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
  })
  newPassword: string;
}
