import { IsUUID, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID del evento para el cual se realiza la reserva',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID del evento debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del evento es requerido' })
  eventId: string;

  @ApiProperty({
    description: 'Cantidad de boletos a reservar (mínimo 1, máximo 10)',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima de boletos es 1' })
  @Max(10, { message: 'La cantidad máxima de boletos es 10' })
  @IsNotEmpty({ message: 'La cantidad de boletos es requerida' })
  quantity: number;
}
