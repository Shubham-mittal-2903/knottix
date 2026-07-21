import type { ProviderHealth, ProviderStatus } from '../types';
import type { ProviderRegistryInterface } from './types';
import { logger } from '@/lib/logger';

export interface ProviderHealthMonitorInterface {
  recordSuccess(providerId: string, latencyMs: number): void;
  recordFailure(providerId: string, error: Error): void;
  getStatus(providerId: string): ProviderStatus;
  getAllHealth(): Record<string, ProviderHealth>;
}

const DEGRADED_THRESHOLD = 3;
const UNAVAILABLE_THRESHOLD = 10;
const LATENCY_WINDOW_SIZE = 20;

export function createProviderHealthMonitor(
  providerRegistry: ProviderRegistryInterface,
): ProviderHealthMonitorInterface {
  const latencyWindows = new Map<string, number[]>();

  function computeAverageLatency(providerId: string): number | null {
    const window = latencyWindows.get(providerId);
    if (!window || window.length === 0) return null;
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  }

  function deriveStatus(consecutiveFailures: number): ProviderStatus {
    if (consecutiveFailures >= UNAVAILABLE_THRESHOLD) return 'unavailable';
    if (consecutiveFailures >= DEGRADED_THRESHOLD) return 'degraded';
    return 'healthy';
  }

  return {
    recordSuccess(providerId: string, latencyMs: number): void {
      let window = latencyWindows.get(providerId);
      if (!window) {
        window = [];
        latencyWindows.set(providerId, window);
      }
      window.push(latencyMs);
      if (window.length > LATENCY_WINDOW_SIZE) {
        window.shift();
      }

      providerRegistry.updateHealth(providerId, {
        status: 'healthy',
        lastCheck: Date.now(),
        lastSuccessfulRequest: Date.now(),
        consecutiveFailures: 0,
        averageLatencyMs: computeAverageLatency(providerId),
      });
    },

    recordFailure(providerId: string, error: Error): void {
      const current = providerRegistry.getHealth(providerId);
      const failures = current.consecutiveFailures + 1;
      const status = deriveStatus(failures);

      providerRegistry.updateHealth(providerId, {
        status,
        lastCheck: Date.now(),
        consecutiveFailures: failures,
      });

      if (status !== 'healthy') {
        logger.warn('ai.health', `Provider ${providerId} status: ${status}`, {
          consecutiveFailures: failures,
          error: error.message,
        });
      }
    },

    getStatus(providerId: string): ProviderStatus {
      return providerRegistry.getHealth(providerId).status;
    },

    getAllHealth(): Record<string, ProviderHealth> {
      const result: Record<string, ProviderHealth> = {};
      for (const id of providerRegistry.list()) {
        result[id] = providerRegistry.getHealth(id);
      }
      return result;
    },
  };
}
