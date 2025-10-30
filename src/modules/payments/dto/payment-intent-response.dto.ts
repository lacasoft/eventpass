import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({
    description: 'Client Secret de Stripe para el frontend',
    example: 'pi_1234567890_secret_abcdefghijk',
  })
  clientSecret: string;

  @ApiProperty({
    description: 'Monto en centavos',
    example: 11500,
  })
  amount: number;

  @ApiProperty({
    description: 'Moneda del pago',
    example: 'usd',
  })
  currency: string;
}
