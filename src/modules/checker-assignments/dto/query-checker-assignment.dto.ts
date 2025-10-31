import { IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryCheckerAssignmentDto {
  @ApiProperty({
    description: 'Filtrar por ID del CHECKER',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  checkerId?: string;

  @ApiProperty({
    description: 'Filtrar por ID del recinto',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiProperty({
    description: 'Filtrar por ID del evento',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiProperty({
    description: 'Filtrar por estado activo/inactivo',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;
}
