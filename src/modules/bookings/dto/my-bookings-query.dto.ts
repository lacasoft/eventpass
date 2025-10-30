import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BookingStatus } from '../enums/booking-status.enum';

export class MyBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de la reserva',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
