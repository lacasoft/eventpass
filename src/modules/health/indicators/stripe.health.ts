import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeHealthIndicator extends HealthIndicator {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    super();
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verificar la conexión a Stripe obteniendo la información de la cuenta
      const balance = await this.stripe.balance.retrieve();

      if (!balance) {
        throw new Error('Failed to retrieve Stripe balance');
      }

      return this.getStatus(key, true, {
        message: 'Stripe API is up and running',
        available: balance.available,
        pending: balance.pending,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Stripe check failed',
        this.getStatus(key, false, {
          message: error.message || 'Stripe API is not available',
        }),
      );
    }
  }
}
