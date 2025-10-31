import { IsUUID, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCheckerAssignmentDto {
  @ApiProperty({
    description: 'IDs de los recintos a asignar',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un recinto' })
  @IsUUID('4', { each: true })
  venueIds?: string[];

  @ApiProperty({
    description: 'IDs de los eventos activos a asignar',
    example: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un evento' })
  @IsUUID('4', { each: true })
  eventIds?: string[];
}
