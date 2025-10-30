import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`], // Swagger requires unsafe-inline
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`], // Swagger requires unsafe-inline
        connectSrc: [`'self'`],
        fontSrc: [`'self'`, 'data:'],
        objectSrc: [`'none'`],
        mediaSrc: [`'self'`],
        frameSrc: [`'none'`],
        // CSP Reporting (optional - configure endpoint to receive reports)
        // reportUri: process.env.CSP_REPORT_URI || '/api/csp-report',
      },
      // Report violations without blocking (useful for testing)
      // reportOnly: process.env.NODE_ENV === 'development',
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Additional helmet options
    frameguard: {
      action: 'deny', // Prevent clickjacking
    },
    noSniff: true, // Prevent MIME type sniffing
    xssFilter: true, // Enable XSS filter
  },
}));
