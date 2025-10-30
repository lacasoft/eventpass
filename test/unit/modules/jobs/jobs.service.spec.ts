import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../../../../src/modules/jobs/jobs.service';
import { QUEUE_NAMES, JOB_NAMES, JOB_PRIORITIES } from '../../../../src/modules/jobs/jobs.constants';
import type { Queue, Job } from 'bull';

describe('JobsService', () => {
  let service: JobsService;
  let bookingsQueue: jest.Mocked<Queue>;
  let eventsQueue: jest.Mocked<Queue>;
  let configService: jest.Mocked<ConfigService>;

  const mockJob = {
    id: 'job-123',
    name: JOB_NAMES.EXPIRE_BOOKING,
    data: { bookingId: 'booking-123' },
    remove: jest.fn(),
  } as unknown as Job;

  beforeEach(async () => {
    // Mock queues
    const mockQueueMethods = {
      add: jest.fn().mockResolvedValue(mockJob),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    bookingsQueue = mockQueueMethods as any;
    eventsQueue = mockQueueMethods as any;

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: any = {
          'jobs.cleanupExpiredBookingsInterval': 5,
          'jobs.completePastEventsTime': '02:00',
          'jobs.bookingExpirationTime': 10,
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getQueueToken(QUEUE_NAMES.BOOKINGS),
          useValue: bookingsQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.EVENTS),
          useValue: eventsQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    configService = module.get(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject queues and config service', () => {
      expect(service).toHaveProperty('bookingsQueue');
      expect(service).toHaveProperty('eventsQueue');
      expect(service).toHaveProperty('configService');
    });
  });

  describe('onModuleInit', () => {
    it('should setup recurring jobs on module initialization', async () => {
      await service.onModuleInit();

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
        {},
        expect.objectContaining({
          repeat: { every: 5 * 60 * 1000 },
          priority: JOB_PRIORITIES.NORMAL,
        }),
      );

      expect(eventsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.COMPLETE_PAST_EVENTS,
        {},
        expect.objectContaining({
          repeat: { cron: '0 2 * * *' },
          priority: JOB_PRIORITIES.NORMAL,
        }),
      );
    });

    it('should use custom cleanup interval from config', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jobs.cleanupExpiredBookingsInterval') return 15;
        if (key === 'jobs.completePastEventsTime') return '02:00';
        return undefined;
      });

      await service.onModuleInit();

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
        {},
        expect.objectContaining({
          repeat: { every: 15 * 60 * 1000 }, // 15 minutes
        }),
      );
    });

    it('should use custom completion time from config', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jobs.cleanupExpiredBookingsInterval') return 5;
        if (key === 'jobs.completePastEventsTime') return '03:30';
        return undefined;
      });

      await service.onModuleInit();

      expect(eventsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.COMPLETE_PAST_EVENTS,
        {},
        expect.objectContaining({
          repeat: { cron: '30 3 * * *' }, // 03:30
        }),
      );
    });

    it('should handle errors during setup gracefully', async () => {
      bookingsQueue.add.mockRejectedValueOnce(new Error('Queue error'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('scheduleBookingExpiration', () => {
    it('should schedule booking expiration job', async () => {
      const bookingId = 'booking-123';

      const result = await service.scheduleBookingExpiration(bookingId);

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_BOOKING,
        { bookingId },
        expect.objectContaining({
          delay: 10 * 60 * 1000, // 10 minutes default
          priority: JOB_PRIORITIES.HIGH,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );

      expect(result).toEqual(mockJob);
    });

    it('should use custom expiration time from config', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jobs.bookingExpirationTime') return 15;
        return undefined;
      });

      await service.scheduleBookingExpiration('booking-123');

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_BOOKING,
        { bookingId: 'booking-123' },
        expect.objectContaining({
          delay: 15 * 60 * 1000, // 15 minutes
        }),
      );
    });

    it('should return job with ID', async () => {
      const mockJobWithId = { ...mockJob, id: 'unique-job-id-456' };
      bookingsQueue.add.mockResolvedValue(mockJobWithId as any);

      const result = await service.scheduleBookingExpiration('booking-123');

      expect(result).toHaveProperty('id', 'unique-job-id-456');
    });

    it('should configure retry strategy', async () => {
      await service.scheduleBookingExpiration('booking-123');

      const callArgs = bookingsQueue.add.mock.calls[0];
      const options = callArgs[2];

      expect(options).toHaveProperty('attempts', 3);
      expect(options).toHaveProperty('backoff', {
        type: 'exponential',
        delay: 5000,
      });
    });
  });

  describe('cancelBookingExpiration', () => {
    it('should cancel pending expiration jobs for a booking', async () => {
      const bookingId = 'booking-123';
      const mockJobs = [
        {
          id: 'job-1',
          name: JOB_NAMES.EXPIRE_BOOKING,
          data: { bookingId },
          remove: jest.fn().mockResolvedValue(undefined),
        },
        {
          id: 'job-2',
          name: JOB_NAMES.EXPIRE_BOOKING,
          data: { bookingId: 'other-booking' },
          remove: jest.fn(),
        },
      ];

      bookingsQueue.getJobs.mockResolvedValue(mockJobs as any);

      await service.cancelBookingExpiration(bookingId);

      expect(bookingsQueue.getJobs).toHaveBeenCalledWith(['delayed', 'waiting']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
    });

    it('should handle case when no jobs found', async () => {
      bookingsQueue.getJobs.mockResolvedValue([]);

      await expect(service.cancelBookingExpiration('booking-123')).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      bookingsQueue.getJobs.mockRejectedValue(new Error('Queue error'));

      // Should not throw
      await expect(service.cancelBookingExpiration('booking-123')).resolves.not.toThrow();
    });

    it('should only cancel jobs with matching bookingId', async () => {
      const mockJobs = [
        {
          name: JOB_NAMES.EXPIRE_BOOKING,
          data: { bookingId: 'booking-123' },
          remove: jest.fn(),
        },
        {
          name: JOB_NAMES.EXPIRE_BOOKING,
          data: { bookingId: 'booking-456' },
          remove: jest.fn(),
        },
        {
          name: JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
          data: { bookingId: 'booking-123' },
          remove: jest.fn(),
        },
      ];

      bookingsQueue.getJobs.mockResolvedValue(mockJobs as any);

      await service.cancelBookingExpiration('booking-123');

      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
      expect(mockJobs[2].remove).not.toHaveBeenCalled();
    });

    it('should handle job removal errors', async () => {
      const mockJobs = [
        {
          name: JOB_NAMES.EXPIRE_BOOKING,
          data: { bookingId: 'booking-123' },
          remove: jest.fn().mockRejectedValue(new Error('Remove failed')),
        },
      ];

      bookingsQueue.getJobs.mockResolvedValue(mockJobs as any);

      // Should not throw even if remove fails
      await expect(service.cancelBookingExpiration('booking-123')).resolves.not.toThrow();
    });
  });

  describe('triggerCleanupExpiredBookings', () => {
    it('should manually trigger cleanup job', async () => {
      const result = await service.triggerCleanupExpiredBookings();

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CLEANUP_EXPIRED_BOOKINGS,
        {},
        expect.objectContaining({
          priority: JOB_PRIORITIES.HIGH,
          removeOnComplete: true,
        }),
      );

      expect(result).toEqual(mockJob);
    });

    it('should return created job', async () => {
      const mockJobWithId = { ...mockJob, id: 'manual-cleanup-789' };
      bookingsQueue.add.mockResolvedValue(mockJobWithId as any);

      const result = await service.triggerCleanupExpiredBookings();

      expect(result).toHaveProperty('id', 'manual-cleanup-789');
    });

    it('should set high priority for manual trigger', async () => {
      await service.triggerCleanupExpiredBookings();

      const callArgs = bookingsQueue.add.mock.calls[0];
      const options = callArgs[2];

      expect(options).toHaveProperty('priority', JOB_PRIORITIES.HIGH);
    });
  });

  describe('triggerCompletePastEvents', () => {
    it('should manually trigger complete past events job', async () => {
      const result = await service.triggerCompletePastEvents();

      expect(eventsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.COMPLETE_PAST_EVENTS,
        {},
        expect.objectContaining({
          priority: JOB_PRIORITIES.HIGH,
          removeOnComplete: true,
        }),
      );

      expect(result).toEqual(mockJob);
    });

    it('should return created job', async () => {
      const mockJobWithId = { ...mockJob, id: 'manual-complete-999' };
      eventsQueue.add.mockResolvedValue(mockJobWithId as any);

      const result = await service.triggerCompletePastEvents();

      expect(result).toHaveProperty('id', 'manual-complete-999');
    });

    it('should set high priority for manual trigger', async () => {
      await service.triggerCompletePastEvents();

      const callArgs = eventsQueue.add.mock.calls[0];
      const options = callArgs[2];

      expect(options).toHaveProperty('priority', JOB_PRIORITIES.HIGH);
    });
  });

  describe('edge cases', () => {
    it('should handle empty bookingId', async () => {
      await service.scheduleBookingExpiration('');

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_BOOKING,
        { bookingId: '' },
        expect.any(Object),
      );
    });

    it('should handle very short expiration time', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jobs.bookingExpirationTime') return 0.1; // 6 seconds
        return undefined;
      });

      await service.scheduleBookingExpiration('booking-123');

      expect(bookingsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_BOOKING,
        expect.any(Object),
        expect.objectContaining({
          delay: 0.1 * 60 * 1000, // 6000ms
        }),
      );
    });

    it('should handle missing config values with defaults', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => defaultValue);

      await service.onModuleInit();

      // Should use defaults
      expect(bookingsQueue.add).toHaveBeenCalled();
      expect(eventsQueue.add).toHaveBeenCalled();
    });

    it('should handle cron time with single digit hours', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jobs.completePastEventsTime') return '3:05';
        return 5;
      });

      await service.onModuleInit();

      expect(eventsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.COMPLETE_PAST_EVENTS,
        {},
        expect.objectContaining({
          repeat: { cron: '5 3 * * *' },
        }),
      );
    });
  });
});
