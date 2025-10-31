import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TicketScanController } from '../../../../src/modules/ticket-scan/ticket-scan.controller';
import { TicketScanService } from '../../../../src/modules/ticket-scan/ticket-scan.service';
import { TicketScanEventsService } from '../../../../src/modules/ticket-scan/ticket-scan-events.service';
import { IdempotencyService } from '../../../../src/modules/ticket-scan/idempotency.service';
import { ScanTicketDto } from '../../../../src/modules/ticket-scan/dto/scan-ticket.dto';
import { ScanResponseDto } from '../../../../src/modules/ticket-scan/dto/scan-response.dto';
import { ScanStatus } from '../../../../src/modules/ticket-scan/enums/scan-status.enum';
import { TicketStatus } from '../../../../src/modules/bookings/enums/ticket-status.enum';

describe('TicketScanController', () => {
  let controller: TicketScanController;
  let ticketScanService: TicketScanService;
  let idempotencyService: IdempotencyService;

  const mockTicketScanService = {
    scanTicket: jest.fn(),
    getVenueOccupancy: jest.fn(),
    getCheckerScanHistory: jest.fn(),
    getEventStats: jest.fn(),
  };

  const mockEventsService = {
    emitOccupancyUpdate: jest.fn(),
    getOccupancyUpdates: jest.fn(),
  };

  const mockIdempotencyService = {
    validateIdempotencyKey: jest.fn(),
    getCachedResponse: jest.fn(),
    cacheResponse: jest.fn(),
    invalidateKey: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'checker-123',
      email: 'checker@example.com',
      role: 'checker',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketScanController],
      providers: [
        {
          provide: TicketScanService,
          useValue: mockTicketScanService,
        },
        {
          provide: TicketScanEventsService,
          useValue: mockEventsService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
      ],
    }).compile();

    controller = module.get<TicketScanController>(TicketScanController);
    ticketScanService = module.get<TicketScanService>(TicketScanService);
    idempotencyService = module.get<IdempotencyService>(IdempotencyService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('scanTicket', () => {
    const scanDto: ScanTicketDto = {
      code: 'TKT-ABC123',
      eventId: 'event-123',
    };

    const mockResponse: ScanResponseDto = {
      status: ScanStatus.VALID,
      message: 'Entrada permitida. ¡Bienvenido!',
      scannedAt: new Date(),
      ticket: {
        id: 'ticket-id',
        ticketCode: 'TKT-ABC123',
        status: TicketStatus.USED,
        eventId: 'event-123',
        usedAt: new Date(),
      },
    };

    const validIdempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

    it('should throw BadRequestException if idempotency key is missing', async () => {
      mockIdempotencyService.validateIdempotencyKey.mockImplementation(() => {
        throw new BadRequestException(
          'Idempotency-Key header is required for scan operations',
        );
      });

      await expect(
        controller.scanTicket(scanDto, mockRequest, undefined),
      ).rejects.toThrow(BadRequestException);

      expect(mockIdempotencyService.validateIdempotencyKey).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockTicketScanService.scanTicket).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if idempotency key is invalid', async () => {
      const invalidKey = 'short';
      mockIdempotencyService.validateIdempotencyKey.mockImplementation(() => {
        throw new BadRequestException(
          'Idempotency-Key must be at least 16 characters long',
        );
      });

      await expect(
        controller.scanTicket(scanDto, mockRequest, invalidKey),
      ).rejects.toThrow(BadRequestException);

      expect(mockIdempotencyService.validateIdempotencyKey).toHaveBeenCalledWith(
        invalidKey,
      );
      expect(mockTicketScanService.scanTicket).not.toHaveBeenCalled();
    });

    it('should return cached response if idempotency key was used before', async () => {
      mockIdempotencyService.validateIdempotencyKey.mockReturnValue(undefined);
      mockIdempotencyService.getCachedResponse.mockResolvedValue(mockResponse);

      const result = await controller.scanTicket(
        scanDto,
        mockRequest,
        validIdempotencyKey,
      );

      expect(result).toEqual(mockResponse);
      expect(mockIdempotencyService.validateIdempotencyKey).toHaveBeenCalledWith(
        validIdempotencyKey,
      );
      expect(mockIdempotencyService.getCachedResponse).toHaveBeenCalledWith(
        mockRequest.user.sub,
        validIdempotencyKey,
      );
      expect(mockTicketScanService.scanTicket).not.toHaveBeenCalled();
      expect(mockIdempotencyService.cacheResponse).not.toHaveBeenCalled();
    });

    it('should process scan and cache response if idempotency key is new', async () => {
      mockIdempotencyService.validateIdempotencyKey.mockReturnValue(undefined);
      mockIdempotencyService.getCachedResponse.mockResolvedValue(null);
      mockTicketScanService.scanTicket.mockResolvedValue(mockResponse);

      const result = await controller.scanTicket(
        scanDto,
        mockRequest,
        validIdempotencyKey,
      );

      expect(result).toEqual(mockResponse);
      expect(mockIdempotencyService.validateIdempotencyKey).toHaveBeenCalledWith(
        validIdempotencyKey,
      );
      expect(mockIdempotencyService.getCachedResponse).toHaveBeenCalledWith(
        mockRequest.user.sub,
        validIdempotencyKey,
      );
      expect(mockTicketScanService.scanTicket).toHaveBeenCalledWith(
        scanDto,
        mockRequest.user.sub,
      );
      expect(mockIdempotencyService.cacheResponse).toHaveBeenCalledWith(
        mockRequest.user.sub,
        validIdempotencyKey,
        mockResponse,
      );
    });

    it('should handle scan with venueId and sectorId', async () => {
      const scanDtoWithVenue: ScanTicketDto = {
        code: 'TKT-ABC123',
        eventId: 'event-123',
        venueId: 'venue-123',
        sectorId: 'sector-123',
      };

      mockIdempotencyService.validateIdempotencyKey.mockReturnValue(undefined);
      mockIdempotencyService.getCachedResponse.mockResolvedValue(null);
      mockTicketScanService.scanTicket.mockResolvedValue(mockResponse);

      const result = await controller.scanTicket(
        scanDtoWithVenue,
        mockRequest,
        validIdempotencyKey,
      );

      expect(result).toEqual(mockResponse);
      expect(mockTicketScanService.scanTicket).toHaveBeenCalledWith(
        scanDtoWithVenue,
        mockRequest.user.sub,
      );
    });

    it('should handle rejected scan and cache the rejection response', async () => {
      const rejectedResponse: ScanResponseDto = {
        status: ScanStatus.ALREADY_USED,
        message: 'Ticket ya utilizado',
        scannedAt: new Date(),
        ticket: {
          id: 'ticket-id',
          ticketCode: 'TKT-ABC123',
          status: TicketStatus.USED,
          eventId: 'event-123',
          usedAt: new Date(),
        },
      };

      mockIdempotencyService.validateIdempotencyKey.mockReturnValue(undefined);
      mockIdempotencyService.getCachedResponse.mockResolvedValue(null);
      mockTicketScanService.scanTicket.mockResolvedValue(rejectedResponse);

      const result = await controller.scanTicket(
        scanDto,
        mockRequest,
        validIdempotencyKey,
      );

      expect(result).toEqual(rejectedResponse);
      expect(mockIdempotencyService.cacheResponse).toHaveBeenCalledWith(
        mockRequest.user.sub,
        validIdempotencyKey,
        rejectedResponse,
      );
    });

    it('should use different cache keys for different checkers', async () => {
      const checker1Request = { user: { sub: 'checker-1' } };
      const checker2Request = { user: { sub: 'checker-2' } };

      mockIdempotencyService.validateIdempotencyKey.mockReturnValue(undefined);
      mockIdempotencyService.getCachedResponse.mockResolvedValue(null);
      mockTicketScanService.scanTicket.mockResolvedValue(mockResponse);

      await controller.scanTicket(scanDto, checker1Request, validIdempotencyKey);
      await controller.scanTicket(scanDto, checker2Request, validIdempotencyKey);

      expect(mockIdempotencyService.getCachedResponse).toHaveBeenNthCalledWith(
        1,
        'checker-1',
        validIdempotencyKey,
      );
      expect(mockIdempotencyService.getCachedResponse).toHaveBeenNthCalledWith(
        2,
        'checker-2',
        validIdempotencyKey,
      );
    });
  });

  describe('getVenueOccupancy', () => {
    it('should return venue occupancy data', async () => {
      const mockOccupancy = {
        eventId: 'event-123',
        venueId: 'venue-123',
        capacity: 1000,
        currentOccupancy: 750,
        occupancyPercentage: 75,
        availableCapacity: 250,
      };

      mockTicketScanService.getVenueOccupancy.mockResolvedValue(mockOccupancy);

      const result = await controller.getVenueOccupancy('event-123', 'venue-123');

      expect(result).toEqual(mockOccupancy);
      expect(mockTicketScanService.getVenueOccupancy).toHaveBeenCalledWith(
        'event-123',
        'venue-123',
      );
    });
  });

  describe('getMyScanHistory', () => {
    it('should return scan history for checker', async () => {
      const mockHistory = [
        {
          id: 'record-1',
          ticketCode: 'TKT-123',
          scanStatus: ScanStatus.VALID,
          scannedAt: new Date(),
        },
      ];

      mockTicketScanService.getCheckerScanHistory.mockResolvedValue(mockHistory);

      const result = await controller.getMyScanHistory(mockRequest);

      expect(result).toEqual(mockHistory);
      expect(mockTicketScanService.getCheckerScanHistory).toHaveBeenCalledWith(
        mockRequest.user.sub,
        undefined,
      );
    });

    it('should return scan history filtered by eventId', async () => {
      const mockHistory = [
        {
          id: 'record-1',
          ticketCode: 'TKT-123',
          scanStatus: ScanStatus.VALID,
          scannedAt: new Date(),
        },
      ];

      mockTicketScanService.getCheckerScanHistory.mockResolvedValue(mockHistory);

      const result = await controller.getMyScanHistory(mockRequest, 'event-123');

      expect(result).toEqual(mockHistory);
      expect(mockTicketScanService.getCheckerScanHistory).toHaveBeenCalledWith(
        mockRequest.user.sub,
        'event-123',
      );
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics for checker', async () => {
      const mockStats = {
        eventId: 'event-123',
        checkerId: 'checker-123',
        totalScans: 150,
        validScans: 142,
        rejectedScans: 8,
        successRate: 94.67,
      };

      mockTicketScanService.getEventStats.mockResolvedValue(mockStats);

      const result = await controller.getEventStats('event-123', mockRequest);

      expect(result).toEqual(mockStats);
      expect(mockTicketScanService.getEventStats).toHaveBeenCalledWith(
        'event-123',
        mockRequest.user.sub,
      );
    });
  });
});
