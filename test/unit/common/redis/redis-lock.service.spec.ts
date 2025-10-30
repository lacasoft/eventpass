import { Test, TestingModule } from '@nestjs/testing';
import { RedisLockService } from '../../../../src/common/redis/redis-lock.service';
import Redis from 'ioredis';

// Mock de ioredis
jest.mock('ioredis');

describe('RedisLockService', () => {
  let service: RedisLockService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      set: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisLockService],
    }).compile();

    service = module.get<RedisLockService>(RedisLockService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create Redis instance with default config', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
        }),
      );
    });

    it('should create Redis instance with environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: 'redis.example.com',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'secret123',
      };

      // Create new instance
      new RedisLockService();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret123',
        }),
      );

      process.env = originalEnv;
    });

    it('should register error event handler', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should register connect event handler', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should have retry strategy', () => {
      const mockConstructor = Redis as jest.MockedClass<typeof Redis>;
      const callArgs = mockConstructor.mock.calls as any[][];

      expect(callArgs.length).toBeGreaterThan(0);

      if (callArgs.length > 0 && callArgs[0] && callArgs[0].length > 0) {
        const config = callArgs[0][0] as any;
        expect(config.retryStrategy).toBeDefined();
        expect(typeof config.retryStrategy).toBe('function');

        // Test retry strategy
        const delay1 = config.retryStrategy(1);
        const delay2 = config.retryStrategy(10);
        const delay3 = config.retryStrategy(100);

        expect(delay1).toBe(50); // 1 * 50
        expect(delay2).toBe(500); // 10 * 50
        expect(delay3).toBe(2000); // capped at 2000
      }
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.acquireLock('test-key');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 5000, 'NX');
    });

    it('should fail to acquire lock if already exists', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.acquireLock('test-key');

      expect(result).toBe(false);
      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 5000, 'NX');
    });

    it('should use custom TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('test-key', 10000);

      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 10000, 'NX');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));

      const result = await service.acquireLock('test-key');

      expect(result).toBe(false);
    });

    it('should prefix lock key with "lock:"', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('my-resource');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:my-resource',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.releaseLock('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('lock:test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection error'));

      // Should not throw
      await expect(service.releaseLock('test-key')).resolves.not.toThrow();
    });

    it('should prefix lock key with "lock:"', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.releaseLock('my-resource');

      expect(mockRedis.del).toHaveBeenCalledWith('lock:my-resource');
    });
  });

  describe('withLock', () => {
    it('should execute operation with lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-key', operation);

      expect(result).toBe('result');
      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 5000, 'NX');
      expect(operation).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('lock:test-key');
    });

    it('should throw error if lock cannot be acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      const operation = jest.fn();

      await expect(service.withLock('test-key', operation)).rejects.toThrow(
        'Sistema ocupado: no se pudo adquirir lock para test-key',
      );

      expect(operation).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should release lock even if operation fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(service.withLock('test-key', operation)).rejects.toThrow('Operation failed');

      expect(mockRedis.set).toHaveBeenCalled();
      expect(operation).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('lock:test-key');
    });

    it('should use custom TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockResolvedValue('result');

      await service.withLock('test-key', operation, 15000);

      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 15000, 'NX');
    });

    it('should release lock even if release fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockRejectedValue(new Error('Delete failed'));

      const operation = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-key', operation);

      expect(result).toBe('result');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should handle async operations correctly', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'async result';
      });

      const result = await service.withLock('test-key', operation);

      expect(result).toBe('async result');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle quit errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Quit failed'));

      await expect(service.onModuleDestroy()).rejects.toThrow('Quit failed');
    });
  });

  describe('concurrent lock attempts', () => {
    it('should only allow one lock acquisition at a time', async () => {
      // First call succeeds
      mockRedis.set.mockResolvedValueOnce('OK');
      // Second call fails (lock exists)
      mockRedis.set.mockResolvedValueOnce(null);

      const [result1, result2] = await Promise.all([
        service.acquireLock('test-key'),
        service.acquireLock('test-key'),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple concurrent withLock calls', async () => {
      let callCount = 0;
      mockRedis.set.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? 'OK' : null;
      });
      mockRedis.del.mockResolvedValue(1);

      const operation1 = jest.fn().mockResolvedValue('result1');
      const operation2 = jest.fn().mockResolvedValue('result2');

      const [promise1, promise2] = [
        service.withLock('test-key', operation1),
        service.withLock('test-key', operation2),
      ];

      await expect(promise1).resolves.toBe('result1');
      await expect(promise2).rejects.toThrow('Sistema ocupado');

      expect(operation1).toHaveBeenCalled();
      expect(operation2).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty key', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('');

      expect(mockRedis.set).toHaveBeenCalledWith('lock:', '1', 'PX', 5000, 'NX');
    });

    it('should handle very long key', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const longKey = 'a'.repeat(1000);
      await service.acquireLock(longKey);

      expect(mockRedis.set).toHaveBeenCalledWith(`lock:${longKey}`, '1', 'PX', 5000, 'NX');
    });

    it('should handle zero TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('test-key', 0);

      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', 0, 'NX');
    });

    it('should handle negative TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      await service.acquireLock('test-key', -1000);

      expect(mockRedis.set).toHaveBeenCalledWith('lock:test-key', '1', 'PX', -1000, 'NX');
    });

    it('should handle operation returning undefined', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.withLock('test-key', operation);

      expect(result).toBeUndefined();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should handle operation returning null', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const operation = jest.fn().mockResolvedValue(null);

      const result = await service.withLock('test-key', operation);

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
