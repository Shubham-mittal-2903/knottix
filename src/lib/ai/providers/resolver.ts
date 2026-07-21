import type { AIProvider, ProviderRegistryInterface } from './types';
import type { ModelDefinition } from '../types';
import { AIError } from '../errors';
import type { ModelRegistryInterface } from '../models/types';

export interface ProviderResolverInterface {
  resolveForModel(modelId: string): AIProvider;
  resolveWithFallback(modelId: string): AIProvider;
}

export function createProviderResolver(
  providerRegistry: ProviderRegistryInterface,
  modelRegistry: ModelRegistryInterface,
): ProviderResolverInterface {
  function findModel(modelId: string): ModelDefinition {
    const model = modelRegistry.get(modelId);
    if (!model) {
      throw AIError.modelNotFound(modelId);
    }
    if (model.status === 'unavailable') {
      throw AIError.modelUnavailable(modelId, model.providerId);
    }
    return model;
  }

  return {
    resolveForModel(modelId: string): AIProvider {
      const model = findModel(modelId);
      const provider = providerRegistry.get(model.providerId);
      if (!provider) {
        throw AIError.providerUnavailable(model.providerId);
      }

      const health = providerRegistry.getHealth(model.providerId);
      if (health.status === 'unavailable') {
        throw AIError.providerUnavailable(model.providerId, `Provider is currently unavailable`);
      }

      if (!provider.isAvailable()) {
        throw AIError.providerUnavailable(model.providerId, `Provider is not configured`);
      }

      return provider;
    },

    resolveWithFallback(modelId: string): AIProvider {
      try {
        return this.resolveForModel(modelId);
      } catch {
        const model = modelRegistry.get(modelId);
        if (!model) throw AIError.modelNotFound(modelId);

        const fallbacks = modelRegistry.findByCapability('streaming', true);
        for (const fallback of fallbacks) {
          if (fallback.providerId === model.providerId) continue;
          if (fallback.status !== 'available') continue;

          const provider = providerRegistry.get(fallback.providerId);
          if (provider && provider.isAvailable()) {
            const health = providerRegistry.getHealth(fallback.providerId);
            if (health.status !== 'unavailable') {
              return provider;
            }
          }
        }

        throw AIError.providerUnavailable(model.providerId, `No available provider for model: ${modelId}`);
      }
    },
  };
}
