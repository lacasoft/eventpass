import { ApiProperty } from '@nestjs/swagger';

class OrganizerSummaryDto {
  @ApiProperty({ example: 12 })
  totalEvents: number;

  @ApiProperty({ example: 8 })
  activeEvents: number;

  @ApiProperty({ example: 1250 })
  totalTicketsSold: number;

  @ApiProperty({ example: 62500.0 })
  grossRevenue: number;

  @ApiProperty({ example: 53125.0 })
  netRevenue: number;

  @ApiProperty({ example: 9375.0 })
  platformFees: number;
}

class OrganizerEventStatsDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Concert 2025' })
  title: string;

  @ApiProperty({ example: '2025-06-15T20:00:00Z' })
  eventDate: Date;

  @ApiProperty({ example: 500 })
  totalTickets: number;

  @ApiProperty({ example: 250 })
  soldTickets: number;

  @ApiProperty({ example: 250 })
  availableTickets: number;

  @ApiProperty({ example: 50.0 })
  occupancyRate: number;

  @ApiProperty({ example: 12500.0 })
  revenue: number;

  @ApiProperty({ example: 'published' })
  status: string;
}

export class OrganizerDashboardDto {
  @ApiProperty({ type: OrganizerSummaryDto })
  summary: OrganizerSummaryDto;

  @ApiProperty({ type: [OrganizerEventStatsDto] })
  events: OrganizerEventStatsDto[];
}
