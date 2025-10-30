import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';

/**
 * CSP Report Controller
 *
 * Receives and logs Content Security Policy violation reports from browsers.
 * This helps identify CSP issues in production.
 *
 * To enable:
 * 1. Uncomment the reportUri directive in security.config.ts
 * 2. Add this controller to a module (e.g., AppModule or create SecurityModule)
 * 3. Set CSP_REPORT_URI=/api/csp-report in .env
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
@ApiTags('security')
@Controller('api/csp-report')
export class CspReportController {
  private readonly logger = new Logger(CspReportController.name);

  @Public()
  @Post()
  @HttpCode(204) // No content
  @ApiExcludeEndpoint() // Hide from Swagger docs (internal endpoint)
  @ApiOperation({
    summary: 'Receive CSP violation reports',
    description:
      'Endpoint to receive Content Security Policy violation reports from browsers. Used for monitoring CSP issues in production.',
  })
  @ApiResponse({
    status: 204,
    description: 'Report received successfully',
  })
  async receiveReport(@Body() report: any): Promise<void> {
    // Log CSP violation
    this.logger.warn('CSP Violation Report:', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      originalPolicy: report['csp-report']?.['original-policy'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      columnNumber: report['csp-report']?.['column-number'],
    });

    // In production, you might want to:
    // 1. Store in database for analysis
    // 2. Send to monitoring service (Sentry, DataDog, etc.)
    // 3. Alert on critical violations
    // 4. Aggregate and analyze patterns

    // Example: Send to external monitoring
    // await this.monitoringService.logCspViolation(report);
  }
}
