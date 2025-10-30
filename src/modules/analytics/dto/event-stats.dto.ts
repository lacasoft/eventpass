import { ApiProperty } from '@nestjs/swagger';

class EventBasicInfoDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Concert 2025' })
  title: string;

  @ApiProperty({ example: '2025-06-15T20:00:00Z' })
  eventDate: Date;
}

class EventStatsDetailDto {
  @ApiProperty({ example: 500 })
  totalTickets: number;

  @ApiProperty({ example: 250 })
  soldTickets: number;

  @ApiProperty({ example: 250 })
  availableTickets: number;

  @ApiProperty({ example: 50.0 })
  occupancyRate: number;

  @ApiProperty({ example: 12500.0 })
  grossRevenue: number;

  @ApiProperty({ example: 1875.0 })
  serviceFees: number;

  @ApiProperty({ example: 10625.0 })
  netRevenue: number;

  @ApiProperty({ example: 50.0 })
  averageTicketPrice: number;

  @ApiProperty({ example: 125 })
  totalBookings: number;

  @ApiProperty({ example: 2.0 })
  averageTicketsPerBooking: number;
}

class SalesOverTimeDto {
  @ApiProperty({ example: '2025-01-01' })
  date: string;

  @ApiProperty({ example: 50 })
  ticketsSold: number;

  @ApiProperty({ example: 2500.0 })
  revenue: number;
}

export class EventStatsDto {
  @ApiProperty({ type: EventBasicInfoDto })
  event: EventBasicInfoDto;

  @ApiProperty({ type: EventStatsDetailDto })
  stats: EventStatsDetailDto;

  @ApiProperty({ type: [SalesOverTimeDto] })
  salesOverTime: SalesOverTimeDto[];
}
