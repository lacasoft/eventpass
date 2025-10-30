import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export class QueryUsersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filtrar por rol de usuario',
    example: UserRole.ORGANIZADOR,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role debe ser un rol válido' })
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Filtrar por estado del usuario (active, inactive, suspended)',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status debe ser active, inactive o suspended' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Buscar por email, nombre o apellido (búsqueda parcial)',
    example: 'juan',
  })
  @IsOptional()
  @IsString({ message: 'Search debe ser un texto' })
  search?: string;
}
