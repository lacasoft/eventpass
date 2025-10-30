import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Categorías de eventos de seguridad para auditoría
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // Authorization events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_VIOLATION = 'PERMISSION_VIOLATION',
  ROLE_ESCALATION_ATTEMPT = 'ROLE_ESCALATION_ATTEMPT',

  // Data access events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_OPERATION = 'BULK_OPERATION',

  // Security violations
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',

  // Payment security
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  PAYMENT_FRAUD_DETECTED = 'PAYMENT_FRAUD_DETECTED',

  // Administrative actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

/**
 * Interface para eventos de seguridad
 */
export interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  message: string;
  metadata?: Record<string, any>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Servicio para logging de eventos de seguridad (Security Audit Trail)
 *
 * Este servicio proporciona un registro detallado de todos los eventos
 * relacionados con seguridad para cumplir con requisitos de auditoría.
 */
@Injectable()
export class SecurityAuditService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  /**
   * Registra un evento de seguridad
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.eventType,
      userId: event.userId || 'anonymous',
      userEmail: event.userEmail || 'N/A',
      ip: event.ip || 'Unknown',
      userAgent: event.userAgent || 'Unknown',
      resource: event.resource || 'N/A',
      action: event.action || 'N/A',
      result: event.result,
      message: event.message,
      severity: event.severity || this.determineSeverity(event),
      metadata: event.metadata || {},
    };

    // Usar nivel warn para eventos de seguridad importantes
    const level = this.getLogLevel(logEntry.severity);

    this.logger.log(level, 'Security Event', logEntry);
  }

  /**
   * Log de login exitoso
   */
  logLoginSuccess(userId: string, email: string, ip: string, userAgent: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      userEmail: email,
      ip,
      userAgent,
      result: 'SUCCESS',
      message: `User ${email} logged in successfully`,
      severity: 'LOW',
    });
  }

  /**
   * Log de login fallido
   */
  logLoginFailure(email: string, ip: string, userAgent: string, reason: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_FAILURE,
      userEmail: email,
      ip,
      userAgent,
      result: 'FAILURE',
      message: `Failed login attempt for ${email}: ${reason}`,
      severity: 'MEDIUM',
      metadata: { reason },
    });
  }

  /**
   * Log de acceso denegado
   */
  logAccessDenied(
    userId: string,
    email: string,
    resource: string,
    action: string,
    ip: string,
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.ACCESS_DENIED,
      userId,
      userEmail: email,
      ip,
      resource,
      action,
      result: 'DENIED',
      message: `Access denied for user ${email} to ${action} ${resource}`,
      severity: 'MEDIUM',
    });
  }

  /**
   * Log de rate limit excedido
   */
  logRateLimitExceeded(ip: string, endpoint: string, userAgent: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip,
      userAgent,
      resource: endpoint,
      result: 'DENIED',
      message: `Rate limit exceeded for IP ${ip} on endpoint ${endpoint}`,
      severity: 'MEDIUM',
    });
  }

  /**
   * Log de token inválido
   */
  logInvalidToken(ip: string, userAgent: string, reason: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.INVALID_TOKEN,
      ip,
      userAgent,
      result: 'DENIED',
      message: `Invalid token detected: ${reason}`,
      severity: 'HIGH',
      metadata: { reason },
    });
  }

  /**
   * Log de pago iniciado
   */
  logPaymentInitiated(
    userId: string,
    email: string,
    amount: number,
    bookingId: string,
    ip: string,
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.PAYMENT_INITIATED,
      userId,
      userEmail: email,
      ip,
      result: 'SUCCESS',
      message: `Payment initiated for booking ${bookingId}`,
      severity: 'MEDIUM',
      metadata: { amount, bookingId },
    });
  }

  /**
   * Log de pago exitoso
   */
  logPaymentSuccess(
    userId: string,
    email: string,
    amount: number,
    paymentIntentId: string,
    bookingId: string,
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.PAYMENT_SUCCESS,
      userId,
      userEmail: email,
      result: 'SUCCESS',
      message: `Payment successful for booking ${bookingId}`,
      severity: 'MEDIUM',
      metadata: { amount, paymentIntentId, bookingId },
    });
  }

  /**
   * Log de cambio de contraseña
   */
  logPasswordChanged(userId: string, email: string, ip: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_CHANGED,
      userId,
      userEmail: email,
      ip,
      result: 'SUCCESS',
      message: `Password changed for user ${email}`,
      severity: 'MEDIUM',
    });
  }

  /**
   * Log de solicitud de reset de contraseña
   */
  logPasswordResetRequest(email: string, ip: string, userAgent: string): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
      userEmail: email,
      ip,
      userAgent,
      result: 'SUCCESS',
      message: `Password reset requested for ${email}`,
      severity: 'LOW',
    });
  }

  /**
   * Determina la severidad basada en el tipo de evento
   */
  private determineSeverity(event: SecurityEvent): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = [
      SecurityEventType.ROLE_ESCALATION_ATTEMPT,
      SecurityEventType.PAYMENT_FRAUD_DETECTED,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
    ];

    const highEvents = [
      SecurityEventType.INVALID_TOKEN,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_VIOLATION,
    ];

    const mediumEvents = [
      SecurityEventType.LOGIN_FAILURE,
      SecurityEventType.ACCESS_DENIED,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.PASSWORD_CHANGED,
    ];

    if (criticalEvents.includes(event.eventType)) return 'CRITICAL';
    if (highEvents.includes(event.eventType)) return 'HIGH';
    if (mediumEvents.includes(event.eventType)) return 'MEDIUM';

    return 'LOW';
  }

  /**
   * Obtiene el nivel de log de Winston basado en la severidad
   */
  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warn';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'info';
      default:
        return 'info';
    }
  }
}
