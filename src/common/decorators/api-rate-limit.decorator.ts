import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiHeader } from '@nestjs/swagger';

/**
 * Decorator to document rate limiting in Swagger
 *
 * Usage:
 * @ApiRateLimit({ limit: 5, window: '1 minute' })
 *
 * This will add:
 * - 429 response documentation
 * - Rate limit headers documentation
 * - Information about retry-after
 */
export function ApiRateLimit(options: { limit: number; window: string }) {
  return applyDecorators(
    ApiResponse({
      status: 429,
      description: `Too Many Requests - Rate limit exceeded. This endpoint is limited to ${options.limit} requests per ${options.window} per IP address.`,
      schema: {
        example: {
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        },
      },
    }),
    ApiHeader({
      name: 'X-RateLimit-Limit',
      description: `Maximum number of requests allowed (${options.limit})`,
      required: false,
      schema: {
        type: 'integer',
        example: options.limit,
      },
    }),
    ApiHeader({
      name: 'X-RateLimit-Remaining',
      description: 'Number of requests remaining in the current window',
      required: false,
      schema: {
        type: 'integer',
        example: Math.floor(options.limit / 2),
      },
    }),
    ApiHeader({
      name: 'X-RateLimit-Reset',
      description: 'Unix timestamp when the rate limit window resets',
      required: false,
      schema: {
        type: 'integer',
        example: Date.now() + 60000,
      },
    }),
  );
}

/**
 * Predefined rate limit decorators for common cases
 */

/**
 * Documents global rate limit (100 requests/minute)
 */
export function ApiGlobalRateLimit() {
  return ApiRateLimit({ limit: 100, window: '1 minute' });
}

/**
 * Documents login rate limit (5 requests/minute)
 */
export function ApiLoginRateLimit() {
  return ApiRateLimit({ limit: 5, window: '1 minute' });
}

/**
 * Documents forgot password rate limit (3 requests/minute)
 */
export function ApiForgotPasswordRateLimit() {
  return ApiRateLimit({ limit: 3, window: '1 minute' });
}
