import { BullQueueHealthIndicator } from '../../../../../src/modules/health/indicators/bull-queue.health';
import { HealthCheckError } from '@nestjs/terminus';
import type { Queue } from 'bull';

describe('BullQueueHealthIndicator', () => {
  let indicator: BullQueueHealthIndicator;
  let mockBookingsQueue: jest.Mocked<Queue>;
  let mockEventsQueue: jest.Mocked<Queue>;
  let mockEmailQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    // Mock queues
    mockBookingsQueue = {
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getDelayedCount: jest.fn(),
      getFailedCount: jest.fn(),
    } as any;

    mockEventsQueue = {
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getDelayedCount: jest.fn(),
      getFailedCount: jest.fn(),
    } as any;

    mockEmailQueue = {
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getDelayedCount: jest.fn(),
      getFailedCount: jest.fn(),
    } as any;

    indicator = new BullQueueHealthIndicator(
      mockBookingsQueue,
      mockEventsQueue,
      mockEmailQueue,
    );
  });

  describe('isHealthy', () => {
    it('should return healthy status when all queues are healthy', async () => {
      // Mock queue counts - all healthy
      mockBookingsQueue.getWaitingCount.mockResolvedValue(5);
      mockBookingsQueue.getActiveCount.mockResolvedValue(2);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(1);
      mockBookingsQueue.getFailedCount.mockResolvedValue(0);

      mockEventsQueue.getWaitingCount.mockResolvedValue(3);
      mockEventsQueue.getActiveCount.mockResolvedValue(1);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(2);

      mockEmailQueue.getWaitingCount.mockResolvedValue(10);
      mockEmailQueue.getActiveCount.mockResolvedValue(5);
      mockEmailQueue.getDelayedCount.mockResolvedValue(2);
      mockEmailQueue.getFailedCount.mockResolvedValue(1);

      const result = await indicator.isHealthy('queues');

      expect(result).toEqual({
        queues: {
          status: 'up',
          message: 'All Bull queues are healthy',
          queues: [
            {
              name: 'bookings',
              waiting: 5,
              active: 2,
              delayed: 1,
              failed: 0,
              isHealthy: true,
            },
            {
              name: 'events',
              waiting: 3,
              active: 1,
              delayed: 0,
              failed: 2,
              isHealthy: true,
            },
            {
              name: 'email',
              waiting: 10,
              active: 5,
              delayed: 2,
              failed: 1,
              isHealthy: true,
            },
          ],
          totals: {
            waiting: 18,
            active: 8,
            failed: 3,
            delayed: 3,
          },
        },
      });
    });

    it('should throw HealthCheckError when a queue has too many failed jobs', async () => {
      // Mock queue counts - bookings has too many failed jobs
      mockBookingsQueue.getWaitingCount.mockResolvedValue(5);
      mockBookingsQueue.getActiveCount.mockResolvedValue(2);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(1);
      mockBookingsQueue.getFailedCount.mockResolvedValue(150); // More than 100

      mockEventsQueue.getWaitingCount.mockResolvedValue(3);
      mockEventsQueue.getActiveCount.mockResolvedValue(1);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(2);

      mockEmailQueue.getWaitingCount.mockResolvedValue(10);
      mockEmailQueue.getActiveCount.mockResolvedValue(5);
      mockEmailQueue.getDelayedCount.mockResolvedValue(2);
      mockEmailQueue.getFailedCount.mockResolvedValue(1);

      await expect(indicator.isHealthy('queues')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when multiple queues have too many failed jobs', async () => {
      // Mock queue counts - multiple queues with too many failed jobs
      mockBookingsQueue.getWaitingCount.mockResolvedValue(5);
      mockBookingsQueue.getActiveCount.mockResolvedValue(2);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(1);
      mockBookingsQueue.getFailedCount.mockResolvedValue(150);

      mockEventsQueue.getWaitingCount.mockResolvedValue(3);
      mockEventsQueue.getActiveCount.mockResolvedValue(1);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(120);

      mockEmailQueue.getWaitingCount.mockResolvedValue(10);
      mockEmailQueue.getActiveCount.mockResolvedValue(5);
      mockEmailQueue.getDelayedCount.mockResolvedValue(2);
      mockEmailQueue.getFailedCount.mockResolvedValue(1);

      await expect(indicator.isHealthy('queues')).rejects.toThrow(HealthCheckError);
    });

    it('should not fail when one queue has an error but others are healthy', async () => {
      // Mock one queue throwing an error
      mockBookingsQueue.getWaitingCount.mockRejectedValue(new Error('Queue connection lost'));
      mockBookingsQueue.getActiveCount.mockResolvedValue(0);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(0);
      mockBookingsQueue.getFailedCount.mockResolvedValue(0);

      mockEventsQueue.getWaitingCount.mockResolvedValue(3);
      mockEventsQueue.getActiveCount.mockResolvedValue(1);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(2);

      mockEmailQueue.getWaitingCount.mockResolvedValue(10);
      mockEmailQueue.getActiveCount.mockResolvedValue(5);
      mockEmailQueue.getDelayedCount.mockResolvedValue(2);
      mockEmailQueue.getFailedCount.mockResolvedValue(1);

      const result = await indicator.isHealthy('queues');

      // Should still return a result, but bookings queue should have isHealthy: false
      expect(result.queues.queues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'bookings',
            isHealthy: false,
            error: 'Queue connection lost',
          }),
        ]),
      );
    });

    it('should return healthy with zero jobs in all queues', async () => {
      // Mock empty queues
      mockBookingsQueue.getWaitingCount.mockResolvedValue(0);
      mockBookingsQueue.getActiveCount.mockResolvedValue(0);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(0);
      mockBookingsQueue.getFailedCount.mockResolvedValue(0);

      mockEventsQueue.getWaitingCount.mockResolvedValue(0);
      mockEventsQueue.getActiveCount.mockResolvedValue(0);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(0);

      mockEmailQueue.getWaitingCount.mockResolvedValue(0);
      mockEmailQueue.getActiveCount.mockResolvedValue(0);
      mockEmailQueue.getDelayedCount.mockResolvedValue(0);
      mockEmailQueue.getFailedCount.mockResolvedValue(0);

      const result = await indicator.isHealthy('queues');

      expect(result).toEqual({
        queues: {
          status: 'up',
          message: 'All Bull queues are healthy',
          queues: [
            {
              name: 'bookings',
              waiting: 0,
              active: 0,
              delayed: 0,
              failed: 0,
              isHealthy: true,
            },
            {
              name: 'events',
              waiting: 0,
              active: 0,
              delayed: 0,
              failed: 0,
              isHealthy: true,
            },
            {
              name: 'email',
              waiting: 0,
              active: 0,
              delayed: 0,
              failed: 0,
              isHealthy: true,
            },
          ],
          totals: {
            waiting: 0,
            active: 0,
            failed: 0,
            delayed: 0,
          },
        },
      });
    });

    it('should be healthy with exactly 100 failed jobs (at threshold)', async () => {
      // Mock queue with exactly 100 failed jobs (at the threshold, should be healthy)
      mockBookingsQueue.getWaitingCount.mockResolvedValue(5);
      mockBookingsQueue.getActiveCount.mockResolvedValue(2);
      mockBookingsQueue.getDelayedCount.mockResolvedValue(1);
      mockBookingsQueue.getFailedCount.mockResolvedValue(100);

      mockEventsQueue.getWaitingCount.mockResolvedValue(0);
      mockEventsQueue.getActiveCount.mockResolvedValue(0);
      mockEventsQueue.getDelayedCount.mockResolvedValue(0);
      mockEventsQueue.getFailedCount.mockResolvedValue(0);

      mockEmailQueue.getWaitingCount.mockResolvedValue(0);
      mockEmailQueue.getActiveCount.mockResolvedValue(0);
      mockEmailQueue.getDelayedCount.mockResolvedValue(0);
      mockEmailQueue.getFailedCount.mockResolvedValue(0);

      const result = await indicator.isHealthy('queues');

      expect(result.queues.status).toBe('up');
      expect(result.queues.message).toBe('All Bull queues are healthy');
    });
  });
});
