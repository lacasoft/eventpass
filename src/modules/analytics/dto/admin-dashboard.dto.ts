import { ApiProperty } from '@nestjs/swagger';

class AdminSummaryDto {
  @ApiProperty({ example: 1500 })
  totalUsers: number;

  @ApiProperty({ example: 1450 })
  totalCustomers: number;

  @ApiProperty({ example: 45 })
  totalOrganizers: number;

  @ApiProperty({ example: 5 })
  totalAdmins: number;

  @ApiProperty({ example: 120 })
  totalEvents: number;

  @ApiProperty({ example: 85 })
  activeEvents: number;

  @ApiProperty({ example: 15000 })
  totalTicketsSold: number;

  @ApiProperty({ example: 750000.0 })
  grossRevenue: number;

  @ApiProperty({ example: 112500.0 })
  platformRevenue: number;
}

class TopEventDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Concert 2025' })
  title: string;

  @ApiProperty({ example: 500 })
  soldTickets: number;

  @ApiProperty({ example: 25000.0 })
  revenue: number;
}

class TopOrganizerDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe Productions' })
  name: string;

  @ApiProperty({ example: 15 })
  totalEvents: number;

  @ApiProperty({ example: 75000.0 })
  totalRevenue: number;
}

class RecentActivityDto {
  @ApiProperty({ example: 'booking', enum: ['booking', 'event', 'payment', 'cancellation'] })
  type: string;

  @ApiProperty({ example: 'New booking for Concert 2025' })
  description: string;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  timestamp: Date;
}

export class AdminDashboardDto {
  @ApiProperty({ type: AdminSummaryDto })
  summary: AdminSummaryDto;

  @ApiProperty({ type: [TopEventDto] })
  topEvents: TopEventDto[];

  @ApiProperty({ type: [TopOrganizerDto] })
  topOrganizers: TopOrganizerDto[];

  @ApiProperty({ type: [RecentActivityDto] })
  recentActivity: RecentActivityDto[];
}
