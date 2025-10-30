import {
  SecurityAuditService,
  SecurityEventType,
  SecurityEvent,
} from '../../../../src/common/logger/security-audit.service';
import { Logger } from 'winston';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
    } as any;

    service = new SecurityAuditService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log a security event with all required fields', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
        userEmail: 'user@example.com',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        result: 'SUCCESS',
        message: 'User logged in successfully',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user123',
          userEmail: 'user@example.com',
          ip: '192.168.1.1',
          result: 'SUCCESS',
          message: 'User logged in successfully',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should use default values for optional fields', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.ACCESS_DENIED,
        result: 'DENIED',
        message: 'Access denied',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          userId: 'anonymous',
          userEmail: 'N/A',
          ip: 'Unknown',
          userAgent: 'Unknown',
          resource: 'N/A',
          action: 'N/A',
        }),
      );
    });

    it('should determine severity automatically if not provided', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.LOGIN_FAILURE,
        result: 'FAILURE',
        message: 'Failed login attempt',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          severity: 'MEDIUM',
        }),
      );
    });

    it('should use provided severity over automatic determination', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        result: 'SUCCESS',
        message: 'Login success',
        severity: 'HIGH',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Security Event',
        expect.objectContaining({
          severity: 'HIGH',
        }),
      );
    });
  });

  describe('logLoginSuccess', () => {
    it('should log successful login with correct severity', () => {
      service.logLoginSuccess('user123', 'user@example.com', '192.168.1.1', 'Mozilla/5.0');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user123',
          userEmail: 'user@example.com',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          result: 'SUCCESS',
          severity: 'LOW',
        }),
      );
    });
  });

  describe('logLoginFailure', () => {
    it('should log failed login with reason in metadata', () => {
      service.logLoginFailure('user@example.com', '192.168.1.1', 'Mozilla/5.0', 'Invalid password');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_FAILURE,
          userEmail: 'user@example.com',
          result: 'FAILURE',
          severity: 'MEDIUM',
          metadata: { reason: 'Invalid password' },
        }),
      );
    });
  });

  describe('logAccessDenied', () => {
    it('should log access denied with resource and action', () => {
      service.logAccessDenied('user123', 'user@example.com', '/admin/users', 'DELETE', '192.168.1.1');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.ACCESS_DENIED,
          userId: 'user123',
          resource: '/admin/users',
          action: 'DELETE',
          result: 'DENIED',
          severity: 'MEDIUM',
        }),
      );
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit violation', () => {
      service.logRateLimitExceeded('192.168.1.1', '/api/auth/login', 'Mozilla/5.0');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
          ip: '192.168.1.1',
          resource: '/api/auth/login',
          result: 'DENIED',
          severity: 'MEDIUM',
        }),
      );
    });
  });

  describe('logInvalidToken', () => {
    it('should log invalid token with HIGH severity', () => {
      service.logInvalidToken('192.168.1.1', 'Mozilla/5.0', 'Token expired');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.INVALID_TOKEN,
          result: 'DENIED',
          severity: 'HIGH',
          metadata: { reason: 'Token expired' },
        }),
      );
    });
  });

  describe('logPaymentInitiated', () => {
    it('should log payment initiation with amount and booking ID', () => {
      service.logPaymentInitiated('user123', 'user@example.com', 100.0, 'booking-456', '192.168.1.1');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.PAYMENT_INITIATED,
          userId: 'user123',
          result: 'SUCCESS',
          severity: 'MEDIUM',
          metadata: { amount: 100.0, bookingId: 'booking-456' },
        }),
      );
    });
  });

  describe('logPaymentSuccess', () => {
    it('should log successful payment with payment intent ID', () => {
      service.logPaymentSuccess('user123', 'user@example.com', 150.0, 'pi_123', 'booking-789');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.PAYMENT_SUCCESS,
          result: 'SUCCESS',
          severity: 'MEDIUM',
          metadata: {
            amount: 150.0,
            paymentIntentId: 'pi_123',
            bookingId: 'booking-789',
          },
        }),
      );
    });
  });

  describe('logPasswordChanged', () => {
    it('should log password change event', () => {
      service.logPasswordChanged('user123', 'user@example.com', '192.168.1.1');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.PASSWORD_CHANGED,
          userId: 'user123',
          result: 'SUCCESS',
          severity: 'MEDIUM',
        }),
      );
    });
  });

  describe('logPasswordResetRequest', () => {
    it('should log password reset request', () => {
      service.logPasswordResetRequest('user@example.com', '192.168.1.1', 'Mozilla/5.0');

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
          userEmail: 'user@example.com',
          result: 'SUCCESS',
          severity: 'LOW',
        }),
      );
    });
  });

  describe('Severity Determination', () => {
    it('should assign CRITICAL severity to critical events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.SQL_INJECTION_ATTEMPT,
        result: 'DENIED',
        message: 'SQL injection detected',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'error',
        'Security Event',
        expect.objectContaining({
          severity: 'CRITICAL',
        }),
      );
    });

    it('should assign HIGH severity to high-risk events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.XSS_ATTEMPT,
        result: 'DENIED',
        message: 'XSS attempt detected',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Security Event',
        expect.objectContaining({
          severity: 'HIGH',
        }),
      );
    });

    it('should assign MEDIUM severity to medium-risk events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.ACCESS_DENIED,
        result: 'DENIED',
        message: 'Access denied',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          severity: 'MEDIUM',
        }),
      );
    });

    it('should assign LOW severity to low-risk events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        result: 'SUCCESS',
        message: 'Login successful',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event',
        expect.objectContaining({
          severity: 'LOW',
        }),
      );
    });
  });

  describe('Log Level Mapping', () => {
    it('should use error level for CRITICAL events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.PAYMENT_FRAUD_DETECTED,
        result: 'DENIED',
        message: 'Fraud detected',
        severity: 'CRITICAL',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith('error', 'Security Event', expect.any(Object));
    });

    it('should use warn level for HIGH events', () => {
      const event: SecurityEvent = {
        eventType: SecurityEventType.INVALID_TOKEN,
        result: 'DENIED',
        message: 'Invalid token',
        severity: 'HIGH',
      };

      service.logSecurityEvent(event);

      expect(mockLogger.log).toHaveBeenCalledWith('warn', 'Security Event', expect.any(Object));
    });

    it('should use info level for MEDIUM and LOW events', () => {
      const mediumEvent: SecurityEvent = {
        eventType: SecurityEventType.ACCESS_DENIED,
        result: 'DENIED',
        message: 'Access denied',
        severity: 'MEDIUM',
      };

      service.logSecurityEvent(mediumEvent);

      expect(mockLogger.log).toHaveBeenCalledWith('info', 'Security Event', expect.any(Object));
    });
  });
});
