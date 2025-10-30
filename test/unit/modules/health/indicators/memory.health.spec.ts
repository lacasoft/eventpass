import { MemoryHealthIndicator } from '../../../../../src/modules/health/indicators/memory.health';

describe('MemoryHealthIndicator', () => {
  let indicator: MemoryHealthIndicator;

  beforeEach(() => {
    indicator = new MemoryHealthIndicator();
  });

  describe('isHealthy', () => {
    it('should return result with all required memory information fields', async () => {
      const result = await indicator.isHealthy('memory');

      expect(result).toHaveProperty('memory');
      expect(result.memory).toHaveProperty('status');
      expect(result.memory).toHaveProperty('message');
      expect(result.memory).toHaveProperty('process');
      expect(result.memory).toHaveProperty('system');
    });

    it('should return status either up, ok, or warning', async () => {
      const result = await indicator.isHealthy('memory');

      expect(['up', 'ok', 'warning']).toContain(result.memory.status);
    });

    it('should include all process memory fields', async () => {
      const result = await indicator.isHealthy('memory');

      expect(result.memory.process).toHaveProperty('rss');
      expect(result.memory.process).toHaveProperty('heapTotal');
      expect(result.memory.process).toHaveProperty('heapUsed');
      expect(result.memory.process).toHaveProperty('heapUsedPercentage');
      expect(result.memory.process).toHaveProperty('external');
      expect(result.memory.process).toHaveProperty('arrayBuffers');
    });

    it('should include all system memory fields', async () => {
      const result = await indicator.isHealthy('memory');

      expect(result.memory.system).toHaveProperty('total');
      expect(result.memory.system).toHaveProperty('used');
      expect(result.memory.system).toHaveProperty('free');
      expect(result.memory.system).toHaveProperty('usedPercentage');
    });

    it('should format bytes in human-readable format', async () => {
      const result = await indicator.isHealthy('memory');

      // Verify format contains units (B, KB, MB, GB, TB)
      expect(result.memory.process.rss).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.process.heapTotal).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.process.heapUsed).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.process.external).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.process.arrayBuffers).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.system.total).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.system.used).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
      expect(result.memory.system.free).toMatch(/\d+\.\d+\s+(B|KB|MB|GB|TB)$/);
    });

    it('should return percentages in correct format', async () => {
      const result = await indicator.isHealthy('memory');

      expect(result.memory.process.heapUsedPercentage).toMatch(/^\d+\.\d+%$/);
      expect(result.memory.system.usedPercentage).toMatch(/^\d+\.\d+%$/);
    });

    it('should return valid heap usage percentage', async () => {
      const result = await indicator.isHealthy('memory');

      const heapPercent = parseFloat(result.memory.process.heapUsedPercentage);
      expect(heapPercent).toBeGreaterThanOrEqual(0);
      expect(heapPercent).toBeLessThanOrEqual(100);
    });

    it('should return valid system usage percentage', async () => {
      const result = await indicator.isHealthy('memory');

      const systemPercent = parseFloat(result.memory.system.usedPercentage);
      expect(systemPercent).toBeGreaterThanOrEqual(0);
      expect(systemPercent).toBeLessThanOrEqual(100);
    });

    it('should return valid message', async () => {
      const result = await indicator.isHealthy('memory');

      expect(result.memory.message).toBeDefined();
      expect(typeof result.memory.message).toBe('string');
      expect(result.memory.message.length).toBeGreaterThan(0);
    });
  });
});
