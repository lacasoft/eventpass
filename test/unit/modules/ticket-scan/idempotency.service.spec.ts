import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException } from '@nestjs/common';
import { IdempotencyService } from '../../../../src/modules/ticket-scan/idempotency.service';
import { ScanResponseDto } from '../../../../src/modules/ticket-scan/dto/scan-response.dto';
import { ScanStatus } from '../../../../src/modules/ticket-scan/enums/scan-status.enum';
import { TicketStatus } from '../../../../src/modules/bookings/enums/ticket-status.enum';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateIdempotencyKey', () => {
    it('should throw BadRequestException if key is missing', () => {
      expect(() => service.validateIdempotencyKey(undefined as any)).toThrow(
        BadRequestException,
      );
      expect(() => service.validateIdempotencyKey(undefined as any)).toThrow(
        'Idempotency-Key header is required for scan operations',
      );
    });

    it('should throw BadRequestException if key is empty', () => {
      expect(() => service.validateIdempotencyKey('')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if key is too short', () => {
      expect(() => service.validateIdempotencyKey('short')).toThrow(
        BadRequestException,
      );
      expect(() => service.validateIdempotencyKey('short')).toThrow(
        'Idempotency-Key must be at least 16 characters long',
      );
    });

    it('should throw BadRequestException if key contains invalid characters', () => {
      expect(() =>
        service.validateIdempotencyKey('invalid key with spaces!'),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validateIdempotencyKey('invalid key with spaces!'),
      ).toThrow(
        'Idempotency-Key must contain only alphanumeric characters, hyphens, and underscores',
      );
    });

    it('should accept valid UUID v4', () => {
      const validKey = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => service.validateIdempotencyKey(validKey)).not.toThrow();
    });

    it('should accept valid alphanumeric key with minimum length', () => {
      const validKey = 'abcdef1234567890';
      expect(() => service.validateIdempotencyKey(validKey)).not.toThrow();
    });

    it('should accept key with hyphens and underscores', () => {
      const validKey = 'valid-key_with-hyphens_123456';
      expect(() => service.validateIdempotencyKey(validKey)).not.toThrow();
    });
  });

  describe('getCachedResponse', () => {
    const checkerId = 'checker-123';
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

    it('should return cached response if exists', async () => {
      const mockResponse: ScanResponseDto = {
        status: ScanStatus.VALID,
        message: 'Entrada permitida',
        scannedAt: new Date(),
        ticket: {
          id: 'ticket-id',
          ticketCode: 'TKT-123',
          status: TicketStatus.USED,
          eventId: 'event-id',
          usedAt: new Date(),
        },
      };

      mockCacheManager.get.mockResolvedValue(mockResponse);

      const result = await service.getCachedResponse(checkerId, idempotencyKey);

      expect(result).toEqual(mockResponse);
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checkerId}:${idempotencyKey}`,
      );
    });

    it('should return null if no cached response exists', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getCachedResponse(checkerId, idempotencyKey);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checkerId}:${idempotencyKey}`,
      );
    });
  });

  describe('cacheResponse', () => {
    const checkerId = 'checker-123';
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';
    const mockResponse: ScanResponseDto = {
      status: ScanStatus.VALID,
      message: 'Entrada permitida',
      scannedAt: new Date(),
      ticket: {
        id: 'ticket-id',
        ticketCode: 'TKT-123',
        status: TicketStatus.USED,
        eventId: 'event-id',
        usedAt: new Date(),
      },
    };

    it('should cache response with correct TTL', async () => {
      await service.cacheResponse(checkerId, idempotencyKey, mockResponse);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checkerId}:${idempotencyKey}`,
        mockResponse,
        24 * 60 * 60 * 1000, // 24 hours in milliseconds
      );
    });

    it('should cache different responses for different checkers', async () => {
      const checker1 = 'checker-1';
      const checker2 = 'checker-2';

      await service.cacheResponse(checker1, idempotencyKey, mockResponse);
      await service.cacheResponse(checker2, idempotencyKey, mockResponse);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checker1}:${idempotencyKey}`,
        mockResponse,
        expect.any(Number),
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checker2}:${idempotencyKey}`,
        mockResponse,
        expect.any(Number),
      );
    });
  });

  describe('invalidateKey', () => {
    const checkerId = 'checker-123';
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete cached response', async () => {
      await service.invalidateKey(checkerId, idempotencyKey);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `idempotency:ticket-scan:${checkerId}:${idempotencyKey}`,
      );
    });
  });

  describe('cache key isolation', () => {
    it('should create unique keys for different checkers with same idempotency key', async () => {
      const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';
      const checker1 = 'checker-1';
      const checker2 = 'checker-2';
      const mockResponse: ScanResponseDto = {
        status: ScanStatus.VALID,
        message: 'Test',
        scannedAt: new Date(),
      };

      await service.cacheResponse(checker1, idempotencyKey, mockResponse);
      await service.cacheResponse(checker2, idempotencyKey, mockResponse);

      const calls = mockCacheManager.set.mock.calls;
      expect(calls[0][0]).toBe(
        `idempotency:ticket-scan:${checker1}:${idempotencyKey}`,
      );
      expect(calls[1][0]).toBe(
        `idempotency:ticket-scan:${checker2}:${idempotencyKey}`,
      );
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });

    it('should create unique keys for same checker with different idempotency keys', async () => {
      const checkerId = 'checker-1';
      const key1 = '550e8400-e29b-41d4-a716-446655440001';
      const key2 = '550e8400-e29b-41d4-a716-446655440002';
      const mockResponse: ScanResponseDto = {
        status: ScanStatus.VALID,
        message: 'Test',
        scannedAt: new Date(),
      };

      await service.cacheResponse(checkerId, key1, mockResponse);
      await service.cacheResponse(checkerId, key2, mockResponse);

      const calls = mockCacheManager.set.mock.calls;
      expect(calls[0][0]).toBe(`idempotency:ticket-scan:${checkerId}:${key1}`);
      expect(calls[1][0]).toBe(`idempotency:ticket-scan:${checkerId}:${key2}`);
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });
});
