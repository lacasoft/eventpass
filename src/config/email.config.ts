import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  const port = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);
  const secure = process.env.EMAIL_SMTP_SECURE === 'true';

  return {
    from: {
      name: process.env.EMAIL_FROM_NAME || 'EventPass',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@eventpass.com',
    },
    app: {
      name: process.env.EMAIL_APP_NAME || 'EventPass',
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL || 'support@eventpass.com',
    },
    smtp: {
      host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      port,
      secure, // true for 465, false for other ports
      // Para puerto 587 (STARTTLS), necesitamos requireTLS
      ...(port === 587 && !secure && { requireTLS: true }),
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
      },
      // Configuración adicional para evitar problemas de SSL
      tls: {
        rejectUnauthorized: false,
      },
    },
    templates: {
      ticketsConfirmed: 'tickets-confirmed',
      paymentFailed: 'payment-failed',
    },
  };
});
