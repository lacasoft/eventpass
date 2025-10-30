import { registerAs } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export default registerAs('cache', (): any => ({
  store: async () =>
    await redisStore({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: parseInt(process.env.CACHE_TTL || '300', 10) * 1000, // Redis TTL en milisegundos
    }),
  ttl: parseInt(process.env.CACHE_TTL || '300', 10) * 1000, // TTL en milisegundos
  max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
  isGlobal: true,
}));
