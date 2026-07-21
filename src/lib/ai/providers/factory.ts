import type { ProviderConfig } from '../types';
import type { AIProvider, ProviderFactory, ProviderRegistryInterface } from './types';
import { AIError } from '../errors';
import { logger } from '@/lib/logger';

export interface ProviderFactoryInterface {
  registerFactory(providerId: string, factory: ProviderFactory): void;
  create(config: ProviderConfig): AIProvider;
  discoverAvailable(): string[];
}

const ENV_KEY_MAP: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_AI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

export function createProviderFactory(registry: ProviderRegistryInterface): ProviderFactoryInterface {
  const factories = new Map<string, ProviderFactory>();

  return {
    registerFactory(providerId: string, factory: ProviderFactory): void {
      factories.set(providerId, factory);
      logger.info('ai.factory', `Provider factory registered: ${providerId}`);
    },

    create(config: ProviderConfig): AIProvider {
      const factory = factories.get(config.id);
      if (!factory) {
        throw AIError.providerUnavailable(config.id, `No factory registered for provider: ${config.id}`);
      }
      return factory(config);
    },

    discoverAvailable(): string[] {
      const available: string[] = [];
      for (const [providerId, envVar] of Object.entries(ENV_KEY_MAP)) {
        if (process.env[envVar]) {
          available.push(providerId);
        }
      }
      return available;
    },
  };
}
