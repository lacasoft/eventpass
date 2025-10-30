import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // Si es una HttpException de NestJS
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    }
    // Si es un error genérico de JavaScript
    else if (exception instanceof Error) {
      message = 'An unexpected error occurred';
      error = exception.name;

      // Log completo del error para debugging
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    // Log del error en formato estructurado
    this.logger.error(
      JSON.stringify({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: message,
        error: error,
        ...(exception instanceof Error && {
          stack: exception.stack,
          name: exception.name,
        }),
      }),
    );

    // Respuesta amigable al cliente
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      error: error,
      // Solo incluir stack trace en desarrollo
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    response.status(status).json(errorResponse);
  }
}
