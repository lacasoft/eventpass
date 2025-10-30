import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { EmailHealthIndicator } from './indicators/email.health';
import { StripeHealthIndicator } from './indicators/stripe.health';
import { BullQueueHealthIndicator } from './indicators/bull-queue.health';
import { DiskHealthIndicator } from './indicators/disk.health';
import { MemoryHealthIndicator } from './indicators/memory.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    private email: EmailHealthIndicator,
    private stripe: StripeHealthIndicator,
    private queues: BullQueueHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Checks the health of the application including database, Redis, Email (SMTP), Stripe API, Bull Queues, Disk Space, and Memory',
  })
  @ApiResponse({
    status: 200,
    description: 'All services are healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
          redis: {
            status: 'up',
            message: 'Redis is up and running',
          },
          email: {
            status: 'up',
            message: 'Email service is up and running',
          },
          stripe: {
            status: 'up',
            message: 'Stripe API is up and running',
          },
          queues: {
            status: 'up',
            message: 'All Bull queues are healthy',
            queues: [
              {
                name: 'bookings',
                waiting: 0,
                active: 0,
                delayed: 0,
                failed: 0,
                isHealthy: true,
              },
              {
                name: 'events',
                waiting: 0,
                active: 0,
                delayed: 0,
                failed: 0,
                isHealthy: true,
              },
              {
                name: 'email',
                waiting: 2,
                active: 1,
                delayed: 0,
                failed: 0,
                isHealthy: true,
              },
            ],
            totals: {
              waiting: 2,
              active: 1,
              failed: 0,
              delayed: 0,
            },
          },
          disk: {
            status: 'up',
            message: 'Disk usage is healthy',
            total: '100.00 GB',
            used: '45.50 GB',
            free: '54.50 GB',
            usedPercentage: '45.50%',
          },
          memory: {
            status: 'up',
            message: 'Memory usage is healthy',
            process: {
              rss: '150.25 MB',
              heapTotal: '80.00 MB',
              heapUsed: '55.30 MB',
              heapUsedPercentage: '69.13%',
              external: '2.50 MB',
              arrayBuffers: '1.20 MB',
            },
            system: {
              total: '16.00 GB',
              used: '8.50 GB',
              free: '7.50 GB',
              usedPercentage: '53.13%',
            },
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
          redis: {
            status: 'up',
            message: 'Redis is up and running',
          },
          email: {
            status: 'up',
            message: 'Email service is up and running',
          },
          stripe: {
            status: 'up',
            message: 'Stripe API is up and running',
          },
          queues: {
            status: 'up',
            message: 'All Bull queues are healthy',
          },
          disk: {
            status: 'up',
            message: 'Disk usage is healthy',
          },
          memory: {
            status: 'up',
            message: 'Memory usage is healthy',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are down',
    schema: {
      example: {
        status: 'error',
        info: {
          database: {
            status: 'up',
          },
        },
        error: {
          redis: {
            status: 'down',
            message: 'Redis is not available',
          },
        },
        details: {
          database: {
            status: 'up',
          },
          redis: {
            status: 'down',
            message: 'Redis is not available',
          },
        },
      },
    },
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.email.isHealthy('email'),
      () => this.stripe.isHealthy('stripe'),
      () => this.queues.isHealthy('queues'),
      () => this.disk.isHealthy('disk'),
      () => this.memory.isHealthy('memory'),
    ]);
  }

  @Public()
  @Get('advanced')
  @HealthCheck()
  @ApiOperation({
    summary: 'Advanced health check with detailed metrics',
    description:
      'Provides detailed health information including Bull queue statistics, disk space metrics, memory usage (process and system), timestamp, and uptime. This endpoint is ideal for monitoring dashboards and alerting systems.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information for all services',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-10-30T14:30:00.000Z',
        uptime: 3600.5,
        info: {
          database: {
            status: 'up',
          },
          redis: {
            status: 'up',
            message: 'Redis is up and running',
          },
          email: {
            status: 'up',
            message: 'Email service is up and running',
          },
          stripe: {
            status: 'up',
            message: 'Stripe API is up and running',
          },
          queues: {
            status: 'up',
            message: 'All Bull queues are healthy',
            queues: [
              {
                name: 'bookings',
                waiting: 5,
                active: 2,
                delayed: 1,
                failed: 0,
                isHealthy: true,
              },
              {
                name: 'events',
                waiting: 0,
                active: 0,
                delayed: 0,
                failed: 0,
                isHealthy: true,
              },
              {
                name: 'email',
                waiting: 10,
                active: 3,
                delayed: 2,
                failed: 1,
                isHealthy: true,
              },
            ],
            totals: {
              waiting: 15,
              active: 5,
              failed: 1,
              delayed: 3,
            },
          },
          disk: {
            status: 'up',
            message: 'Disk usage is healthy',
            total: '100.00 GB',
            used: '45.50 GB',
            free: '54.50 GB',
            usedPercentage: '45.50%',
            path: '/home/app/logs',
          },
          memory: {
            status: 'up',
            message: 'Memory usage is healthy',
            process: {
              rss: '150.25 MB',
              heapTotal: '80.00 MB',
              heapUsed: '55.30 MB',
              heapUsedPercentage: '69.13%',
              external: '2.50 MB',
              arrayBuffers: '1.20 MB',
            },
            system: {
              total: '16.00 GB',
              used: '8.50 GB',
              free: '7.50 GB',
              usedPercentage: '53.13%',
            },
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
          redis: {
            status: 'up',
            message: 'Redis is up and running',
          },
          email: {
            status: 'up',
            message: 'Email service is up and running',
          },
          stripe: {
            status: 'up',
            message: 'Stripe API is up and running',
          },
          queues: {
            status: 'up',
            message: 'All Bull queues are healthy',
          },
          disk: {
            status: 'up',
            message: 'Disk usage is healthy',
          },
          memory: {
            status: 'up',
            message: 'Memory usage is healthy',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are unhealthy',
    schema: {
      example: {
        status: 'error',
        timestamp: '2025-10-30T14:30:00.000Z',
        uptime: 3600.5,
        info: {
          database: {
            status: 'up',
          },
        },
        error: {
          memory: {
            status: 'down',
            message: 'Heap memory usage is critical: 95.50%',
          },
          queues: {
            status: 'down',
            message: 'Queues with too many failed jobs (>100): email',
          },
        },
        details: {
          database: {
            status: 'up',
          },
          memory: {
            status: 'down',
            message: 'Heap memory usage is critical: 95.50%',
          },
          queues: {
            status: 'down',
            message: 'Queues with too many failed jobs (>100): email',
          },
        },
      },
    },
  })
  async checkAdvanced() {
    const healthCheck = await this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.email.isHealthy('email'),
      () => this.stripe.isHealthy('stripe'),
      () => this.queues.isHealthy('queues'),
      () => this.disk.isHealthy('disk'),
      () => this.memory.isHealthy('memory'),
    ]);

    // Agregar metadata adicional al health check
    return {
      ...healthCheck,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
