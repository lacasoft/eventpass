import { ApiProperty } from '@nestjs/swagger';

export class VenueOccupancyDto {
  @ApiProperty({
    description: 'ID del recinto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  venueId: string;

  @ApiProperty({
    description: 'Nombre del recinto',
    example: 'Estadio Nacional',
  })
  venueName: string;

  @ApiProperty({
    description: 'Capacidad total del recinto',
    example: 50000,
  })
  capacity: number;

  @ApiProperty({
    description: 'Número de tickets vendidos para este evento',
    example: 35000,
  })
  ticketsSold: number;

  @ApiProperty({
    description: 'Número de personas que ya ingresaron (tickets escaneados)',
    example: 28000,
  })
  currentOccupancy: number;

  @ApiProperty({
    description: 'Porcentaje de ocupación actual vs capacidad',
    example: 56.0,
  })
  occupancyPercentage: number;

  @ApiProperty({
    description: 'Porcentaje de asistencia (tickets usados vs vendidos)',
    example: 80.0,
  })
  attendanceRate: number;

  @ApiProperty({
    description: 'Espacios disponibles',
    example: 15000,
  })
  availableSpaces: number;
}
