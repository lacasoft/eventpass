import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsUUID,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory } from '../enums/event-category.enum';

export class CreateEventDto {
  @ApiProperty({
    description: 'ID del recinto donde se realizará el evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID del recinto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del recinto es requerido' })
  venueId: string;

  @ApiProperty({
    description: 'Título del evento',
    example: 'Concierto Rock en Vivo 2025',
    minLength: 5,
    maxLength: 200,
  })
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El título no puede exceder 200 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del evento',
    example:
      'Un increíble concierto de rock con las mejores bandas nacionales. Incluye apertura de puertas a las 19:00 hrs y show principal a las 21:00 hrs.',
    minLength: 50,
    maxLength: 2000,
  })
  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MinLength(50, { message: 'La descripción debe tener al menos 50 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description: string;

  @ApiProperty({
    description: 'Categoría del evento',
    enum: EventCategory,
    example: EventCategory.CONCERT,
  })
  @IsEnum(EventCategory, { message: 'La categoría debe ser: concert, sports u other' })
  @IsNotEmpty({ message: 'La categoría es requerida' })
  category: EventCategory;

  @ApiProperty({
    description: 'Fecha y hora del evento (ISO 8601 format)',
    example: '2025-12-31T20:00:00.000Z',
  })
  @IsDateString(
    {},
    { message: 'La fecha del evento debe ser una fecha válida en formato ISO 8601' },
  )
  @IsNotEmpty({ message: 'La fecha del evento es requerida' })
  eventDate: string;

  @ApiPropertyOptional({
    description: 'URL de la imagen promocional del evento',
    example: 'https://example.com/images/event-banner.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen debe ser una URL válida' })
  @MaxLength(500, { message: 'La URL de la imagen no puede exceder 500 caracteres' })
  imageUrl?: string;

  @ApiProperty({
    description: 'Precio del boleto en la moneda local',
    example: 25000,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'El precio del boleto debe ser un número' })
  @IsNotEmpty({ message: 'El precio del boleto es requerido' })
  @Min(0.01, { message: 'El precio del boleto debe ser mayor a 0' })
  ticketPrice: number;

  @ApiProperty({
    description: 'Cantidad total de boletos disponibles (no debe exceder la capacidad del recinto)',
    example: 1000,
    minimum: 1,
  })
  @IsNumber({}, { message: 'La cantidad de boletos debe ser un número' })
  @IsNotEmpty({ message: 'La cantidad de boletos es requerida' })
  @Min(1, { message: 'Debe haber al menos 1 boleto disponible' })
  totalTickets: number;
}
