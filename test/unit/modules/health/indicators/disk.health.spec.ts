import { DiskHealthIndicator } from '../../../../../src/modules/health/indicators/disk.health';

describe('DiskHealthIndicator', () => {
  let indicator: DiskHealthIndicator;

  beforeEach(() => {
    indicator = new DiskHealthIndicator();
  });

  describe('isHealthy', () => {
    it('should return result with all required disk information fields', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result).toHaveProperty('disk');
      expect(result.disk).toHaveProperty('status');
      expect(result.disk).toHaveProperty('message');
      expect(result.disk).toHaveProperty('total');
      expect(result.disk).toHaveProperty('used');
      expect(result.disk).toHaveProperty('free');
      expect(result.disk).toHaveProperty('usedPercentage');
      expect(result.disk).toHaveProperty('path');
    });

    it('should return status up or ok', async () => {
      const result = await indicator.isHealthy('disk');

      expect(['up', 'ok']).toContain(result.disk.status);
    });

    it('should format bytes in human-readable format', async () => {
      const result = await indicator.isHealthy('disk');

      // Verify format contains units (B, KB, MB, GB, TB)
      expect(result.disk.total).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.disk.used).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.disk.free).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
    });

    it('should return usedPercentage in correct format', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result.disk.usedPercentage).toMatch(/^\d+\.\d+%$/);
    });

    it('should include path in result', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result.disk.path).toBeDefined();
      expect(typeof result.disk.path).toBe('string');
      expect(result.disk.path.length).toBeGreaterThan(0);
    });

    it('should return valid message', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result.disk.message).toBeDefined();
      expect(typeof result.disk.message).toBe('string');
      expect(result.disk.message.length).toBeGreaterThan(0);
    });
  });
});
