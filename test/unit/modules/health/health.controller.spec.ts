import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../../src/modules/health/health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../../../src/modules/health/indicators/redis.health';
import { EmailHealthIndicator } from '../../../../src/modules/health/indicators/email.health';
import { StripeHealthIndicator } from '../../../../src/modules/health/indicators/stripe.health';
import { BullQueueHealthIndicator } from '../../../../src/modules/health/indicators/bull-queue.health';
import { DiskHealthIndicator } from '../../../../src/modules/health/indicators/disk.health';
import { MemoryHealthIndicator } from '../../../../src/modules/health/indicators/memory.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let dbHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let redisHealthIndicator: jest.Mocked<RedisHealthIndicator>;
  let emailHealthIndicator: jest.Mocked<EmailHealthIndicator>;
  let stripeHealthIndicator: jest.Mocked<StripeHealthIndicator>;
  let bullQueueHealthIndicator: jest.Mocked<BullQueueHealthIndicator>;
  let diskHealthIndicator: jest.Mocked<DiskHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;

  beforeEach(async () => {
    // Mock HealthCheckService
    healthCheckService = {
      check: jest.fn(),
    } as any;

    // Mock all health indicators
    dbHealthIndicator = {
      pingCheck: jest.fn(),
    } as any;

    redisHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    emailHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    stripeHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    bullQueueHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    diskHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    memoryHealthIndicator = {
      isHealthy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: dbHealthIndicator,
        },
        {
          provide: RedisHealthIndicator,
          useValue: redisHealthIndicator,
        },
        {
          provide: EmailHealthIndicator,
          useValue: emailHealthIndicator,
        },
        {
          provide: StripeHealthIndicator,
          useValue: stripeHealthIndicator,
        },
        {
          provide: BullQueueHealthIndicator,
          useValue: bullQueueHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: diskHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: memoryHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should call health check service with all indicators', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          email: { status: 'up' },
          stripe: { status: 'up' },
          queues: { status: 'up' },
          disk: { status: 'up' },
          memory: { status: 'up' },
        },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result).toEqual(mockHealthResult);
    });

    it('should return health check result', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
    });
  });

  describe('checkAdvanced', () => {
    it('should call health check service with all indicators', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          email: { status: 'up' },
          stripe: { status: 'up' },
          queues: { status: 'up' },
          disk: { status: 'up' },
          memory: { status: 'up' },
        },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.checkAdvanced();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return health check result with timestamp and uptime', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          email: { status: 'up' },
          stripe: { status: 'up' },
          queues: { status: 'up' },
          disk: { status: 'up' },
          memory: { status: 'up' },
        },
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.checkAdvanced();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
    });

    it('should return valid ISO timestamp', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.checkAdvanced();

      // Verify timestamp is a valid ISO string
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should return positive uptime', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.checkAdvanced();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should preserve all health check data', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          queues: {
            status: 'up',
            queues: [
              { name: 'email', waiting: 5, active: 2 },
            ],
          },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.checkAdvanced();

      expect(result.status).toBe(mockHealthResult.status);
      expect(result.info).toEqual(mockHealthResult.info);
      expect(result.error).toEqual(mockHealthResult.error);
      expect(result.details).toEqual(mockHealthResult.details);
    });
  });
});
