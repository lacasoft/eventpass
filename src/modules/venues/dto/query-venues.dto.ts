import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryVenuesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ciudad',
    example: 'Santiago',
  })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser un texto' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  city?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por nombre del recinto',
    example: 'Teatro',
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser un texto' })
  @MaxLength(200, { message: 'El término de búsqueda no puede exceder 200 caracteres' })
  search?: string;
}
