import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'ID de la reserva',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  bookingId: string;
}
