import type { ProviderConfig, ProviderHealth } from '../types';
import type { AIProvider, ProviderFactory, ProviderRegistryInterface } from './types';
import { AIError } from '../errors';
import { logger } from '@/lib/logger';

interface ProviderEntry {
  factory: ProviderFactory;
  config: ProviderConfig;
  instance: AIProvider | null;
  health: ProviderHealth;
}

export function createProviderRegistry(): ProviderRegistryInterface {
  const providers = new Map<string, ProviderEntry>();

  function defaultHealth(): ProviderHealth {
    return {
      status: 'healthy',
      lastCheck: Date.now(),
      lastSuccessfulRequest: null,
      consecutiveFailures: 0,
      averageLatencyMs: null,
    };
  }

  return {
    register(id: string, factory: ProviderFactory, config: ProviderConfig): void {
      if (providers.has(id)) {
        logger.warn('ai.providers', `Provider already registered: ${id}, overwriting`);
      }
      providers.set(id, {
        factory,
        config,
        instance: null,
        health: defaultHealth(),
      });
      logger.info('ai.providers', `Provider registered: ${id}`);
    },

    get(id: string): AIProvider | undefined {
      const entry = providers.get(id);
      if (!entry) return undefined;

      if (!entry.instance) {
        entry.instance = entry.factory(entry.config);
      }
      return entry.instance;
    },

    resolve(id: string): AIProvider {
      const provider = this.get(id);
      if (!provider) {
        throw AIError.providerUnavailable(id, `Provider not registered: ${id}`);
      }
      return provider;
    },

    list(): string[] {
      return Array.from(providers.keys());
    },

    has(id: string): boolean {
      return providers.has(id);
    },

    getHealth(id: string): ProviderHealth {
      const entry = providers.get(id);
      if (!entry) {
        throw AIError.providerUnavailable(id, `Provider not registered: ${id}`);
      }
      return { ...entry.health };
    },

    updateHealth(id: string, update: Partial<ProviderHealth>): void {
      const entry = providers.get(id);
      if (!entry) return;
      Object.assign(entry.health, update);
    },
  };
}
