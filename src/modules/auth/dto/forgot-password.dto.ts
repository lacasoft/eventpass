import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email del usuario que solicita recuperar su contraseña',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;
}
