import { IsOptional, IsEnum, IsString, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EventCategory } from '../enums/event-category.enum';

export class QueryEventsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por categoría de evento',
    enum: EventCategory,
    example: EventCategory.CONCERT,
  })
  @IsOptional()
  @IsEnum(EventCategory, { message: 'La categoría debe ser: concert, sports u other' })
  category?: EventCategory;

  @ApiPropertyOptional({
    description: 'Buscar por título del evento (búsqueda parcial)',
    example: 'Rock',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del organizador',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  organizerId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ciudad (del recinto)',
    example: 'Santiago',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
