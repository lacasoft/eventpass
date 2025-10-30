import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey } from '@nestjs/cache-manager';

export function Cache(ttl?: number) {
  return applyDecorators(UseInterceptors(CacheInterceptor), CacheKey(ttl?.toString() || 'default'));
}
