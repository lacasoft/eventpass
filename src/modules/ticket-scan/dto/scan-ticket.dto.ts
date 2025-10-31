import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanTicketDto {
  @ApiProperty({
    description: 'Código del ticket a escanear',
    example: 'TKT-ABC123-XYZ789',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'ID del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'ID del recinto (opcional, se validará contra la asignación del checker)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiProperty({
    description: 'ID del sector (opcional, para implementación futura)',
    example: 'SECTOR-A',
    required: false,
  })
  @IsOptional()
  @IsString()
  sectorId?: string;
}
