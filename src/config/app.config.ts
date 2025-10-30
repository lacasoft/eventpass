import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  name: process.env.APP_NAME || 'ls-template',
  env: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-key',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT || '5', 10),
  },
}));
