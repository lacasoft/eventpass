import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Obtener información de memoria del proceso y del sistema
      const processMemory = process.memoryUsage();
      const systemMemory = {
        total: require('os').totalmem(),
        free: require('os').freemem(),
      };

      // Calcular uso de memoria del sistema
      const systemUsed = systemMemory.total - systemMemory.free;
      const systemUsedPercentage = ((systemUsed / systemMemory.total) * 100).toFixed(2);

      // Calcular uso de memoria heap del proceso
      const heapUsedPercentage = (
        (processMemory.heapUsed / processMemory.heapTotal) *
        100
      ).toFixed(2);

      // Definir umbrales
      const heapWarningThreshold = 80; // 80% del heap usado
      const heapCriticalThreshold = 90; // 90% del heap usado
      const systemWarningThreshold = 85; // 85% de RAM del sistema usada
      const systemCriticalThreshold = 95; // 95% de RAM del sistema usada

      const heapPercent = parseFloat(heapUsedPercentage);
      const systemPercent = parseFloat(systemUsedPercentage);

      // Verificar si hay problemas críticos de memoria
      if (heapPercent >= heapCriticalThreshold) {
        throw new Error(
          `Heap memory usage is critical: ${heapUsedPercentage}% (threshold: ${heapCriticalThreshold}%)`,
        );
      }

      if (systemPercent >= systemCriticalThreshold) {
        throw new Error(
          `System memory usage is critical: ${systemUsedPercentage}% (threshold: ${systemCriticalThreshold}%)`,
        );
      }

      // Determinar el estado
      let status = 'ok';
      let message = 'Memory usage is healthy';

      if (heapPercent >= heapWarningThreshold || systemPercent >= systemWarningThreshold) {
        status = 'warning';
        message = `Memory usage is high - Heap: ${heapUsedPercentage}%, System: ${systemUsedPercentage}%`;
      }

      return this.getStatus(key, true, {
        message,
        status,
        process: {
          rss: this.formatBytes(processMemory.rss), // Resident Set Size - memoria total
          heapTotal: this.formatBytes(processMemory.heapTotal),
          heapUsed: this.formatBytes(processMemory.heapUsed),
          heapUsedPercentage: `${heapUsedPercentage}%`,
          external: this.formatBytes(processMemory.external), // Memoria C++ externa
          arrayBuffers: this.formatBytes(processMemory.arrayBuffers),
        },
        system: {
          total: this.formatBytes(systemMemory.total),
          used: this.formatBytes(systemUsed),
          free: this.formatBytes(systemMemory.free),
          usedPercentage: `${systemUsedPercentage}%`,
        },
      });
    } catch (error) {
      throw new HealthCheckError(
        'Memory check failed',
        this.getStatus(key, false, {
          message: error.message || 'Unable to check memory usage',
        }),
      );
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
