import { IsString, IsNotEmpty, MaxLength, IsNumber, Min, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({
    description: 'Nombre del recinto',
    example: 'Teatro Municipal de Santiago',
    maxLength: 200,
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Dirección del recinto',
    example: 'Agustinas 794, Santiago Centro',
    maxLength: 500,
  })
  @IsString({ message: 'La dirección debe ser un texto' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  @MaxLength(500, { message: 'La dirección no puede exceder 500 caracteres' })
  address: string;

  @ApiProperty({
    description: 'Ciudad del recinto',
    example: 'Santiago',
    maxLength: 100,
  })
  @IsString({ message: 'La ciudad debe ser un texto' })
  @IsNotEmpty({ message: 'La ciudad es requerida' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  city: string;

  @ApiProperty({
    description: 'Código de país ISO 3166-1 alpha-2 (2 caracteres)',
    example: 'CL',
    minLength: 2,
    maxLength: 2,
  })
  @IsString({ message: 'El país debe ser un texto' })
  @IsNotEmpty({ message: 'El país es requerido' })
  @Length(2, 2, { message: 'El código de país debe tener exactamente 2 caracteres' })
  @Matches(/^[A-Z]{2}$/, {
    message: 'El código de país debe ser un código ISO 3166-1 alpha-2 válido (2 letras mayúsculas)',
  })
  country: string;

  @ApiProperty({
    description: 'Capacidad máxima del recinto',
    example: 1500,
    minimum: 1,
  })
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @IsNotEmpty({ message: 'La capacidad es requerida' })
  @Min(1, { message: 'La capacidad debe ser mayor a 0' })
  capacity: number;
}
