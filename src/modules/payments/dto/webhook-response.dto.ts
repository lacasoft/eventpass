import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Indica que el webhook fue recibido correctamente',
    example: true,
  })
  received: boolean;
}
