import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckerAssignmentDto {
  @ApiProperty({
    description: 'ID del usuario con rol CHECKER al que se le asignarán los recintos y eventos',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  checkerId: string;

  @ApiProperty({
    description: 'IDs de los recintos a asignar',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un recinto' })
  @IsUUID('4', { each: true })
  venueIds: string[];

  @ApiProperty({
    description: 'IDs de los eventos activos a asignar',
    example: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un evento' })
  @IsUUID('4', { each: true })
  eventIds: string[];
}
