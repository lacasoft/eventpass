import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  constructor() {
    this.registry = new Registry();
  }

  createCounter(name: string, help: string): Counter {
    return new Counter({
      name,
      help,
      registers: [this.registry],
    });
  }

  createHistogram(name: string, help: string, buckets?: number[]): Histogram {
    return new Histogram({
      name,
      help,
      buckets,
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
