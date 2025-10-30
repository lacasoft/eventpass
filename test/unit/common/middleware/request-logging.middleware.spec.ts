import { RequestLoggingMiddleware } from '../../../../src/common/middleware/request-logging.middleware';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;
  let mockLogger: jest.Mocked<Logger>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock Request
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/users',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
        referer: 'http://localhost:3000',
      },
      socket: {
        remoteAddress: '192.168.1.1',
      },
    } as any;

    // Mock Response
    mockResponse = {
      statusCode: 200,
      send: jest.fn().mockImplementation(function (data: any) {
        return this;
      }),
      get: jest.fn().mockReturnValue('1024'),
    } as any;

    mockNext = jest.fn();

    middleware = new RequestLoggingMiddleware(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Logging', () => {
    it('should log incoming request with all metadata', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith('http', 'Incoming request', {
        method: 'GET',
        url: '/api/users',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'http://localhost:3000',
        correlationId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should call next() after logging request', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should add correlationId to request object', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBeDefined();
      expect(typeof (mockRequest as any).correlationId).toBe('string');
    });
  });

  describe('Response Logging', () => {
    it('should log request completion on response.send()', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response
      mockResponse.send?.('response data');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Request completed',
        expect.objectContaining({
          method: 'GET',
          url: '/api/users',
          statusCode: 200,
          responseTime: expect.stringContaining('ms'),
          contentLength: '1024',
        }),
      );
    });

    it('should include response time in milliseconds', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger response
      mockResponse.send?.('response data');

      // Verify response time format
      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Request completed',
        expect.objectContaining({
          responseTime: expect.stringMatching(/^\d+ms$/),
        }),
      );
    });
  });

  describe('Error Logging', () => {
    it('should log 4xx client errors', () => {
      mockResponse.statusCode = 404;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send?.('Not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP Error Response',
        expect.objectContaining({
          statusCode: 404,
          errorType: 'Client Error',
        }),
      );
    });

    it('should log 5xx server errors', () => {
      mockResponse.statusCode = 500;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send?.('Internal server error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HTTP Error Response',
        expect.objectContaining({
          statusCode: 500,
          errorType: 'Server Error',
        }),
      );
    });

    it('should not log errors for successful responses', () => {
      mockResponse.statusCode = 200;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send?.('Success');

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockRequest.headers = {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          ip: '10.0.0.1',
        }),
      );
    });

    it('should use req.ip if x-forwarded-for is not present', () => {
      (mockRequest as any).ip = '172.16.0.1';
      mockRequest.headers = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          ip: '172.16.0.1',
        }),
      );
    });

    it('should use socket.remoteAddress as fallback', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.headers = {};
      mockRequest.socket = { remoteAddress: '192.168.1.100' } as any;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          ip: '192.168.1.100',
        }),
      );
    });

    it('should use "Unknown" if no IP is available', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.headers = {};
      mockRequest.socket = undefined as any;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          ip: 'Unknown',
        }),
      );
    });
  });

  describe('Metadata Extraction', () => {
    it('should handle missing user-agent header', () => {
      mockRequest.headers = {};

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          userAgent: 'Unknown',
        }),
      );
    });

    it('should handle missing referer header', () => {
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0',
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          referer: 'Direct',
        }),
      );
    });

    it('should extract referrer (alternative spelling)', () => {
      mockRequest.headers = {
        referrer: 'https://google.com',
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'http',
        'Incoming request',
        expect.objectContaining({
          referer: 'https://google.com',
        }),
      );
    });
  });

  describe('Correlation ID', () => {
    it('should generate unique correlation IDs', () => {
      const correlationIds = new Set();

      for (let i = 0; i < 100; i++) {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        correlationIds.add((mockRequest as any).correlationId);

        // Reset request for next iteration
        mockRequest = {
          ...mockRequest,
        };
      }

      // All correlation IDs should be unique
      expect(correlationIds.size).toBe(100);
    });

    it('should include timestamp in correlation ID', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      const correlationId = (mockRequest as any).correlationId;
      const timestamp = correlationId.split('-')[0];

      expect(parseInt(timestamp)).toBeGreaterThan(0);
      expect(parseInt(timestamp)).toBeLessThanOrEqual(Date.now());
    });
  });
});
