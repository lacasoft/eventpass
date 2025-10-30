import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ description: 'Página actual', example: 1 })
  page: number;

  @ApiProperty({ description: 'Elementos por página', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total de elementos', example: 5 })
  total: number;

  @ApiProperty({ description: 'Total de páginas', example: 1 })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Datos paginados', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Metadata de paginación', type: PaginationMeta })
  meta: PaginationMeta;
}
