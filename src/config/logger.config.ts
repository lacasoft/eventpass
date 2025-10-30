import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        nestWinstonModuleUtilities.format.nestLike('EventPass', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    // Error logs - All errors with stack traces
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // Combined logs - All requests and operations
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),

    // Security audit logs - Authentication, authorization, security events
    new winston.transports.File({
      filename: 'logs/security-audit.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep 30 days of security logs
    }),

    // Request logs - HTTP request/response tracking
    new winston.transports.File({
      filename: 'logs/requests.log',
      level: 'http',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
};
