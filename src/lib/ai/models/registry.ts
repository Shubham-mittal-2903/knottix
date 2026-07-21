import type { ModelCapabilities, ModelDefinition } from '../types';
import type { ModelRegistryInterface } from './types';
import { AIError } from '../errors';
import { logger } from '@/lib/logger';

export function createModelRegistry(): ModelRegistryInterface {
  const models = new Map<string, ModelDefinition>();

  return {
    register(model: ModelDefinition): void {
      if (models.has(model.id)) {
        logger.warn('ai.models', `Model already registered: ${model.id}, overwriting`);
      }
      models.set(model.id, model);
      logger.info('ai.models', `Model registered: ${model.id} (provider: ${model.providerId})`);
    },

    get(id: string): ModelDefinition | undefined {
      return models.get(id);
    },

    resolve(id: string): ModelDefinition {
      const model = models.get(id);
      if (!model) {
        throw AIError.modelNotFound(id);
      }
      return model;
    },

    list(): ModelDefinition[] {
      return Array.from(models.values());
    },

    listByProvider(providerId: string): ModelDefinition[] {
      return Array.from(models.values()).filter((m) => m.providerId === providerId);
    },

    findByCapability<K extends keyof ModelCapabilities>(
      capability: K,
      value: ModelCapabilities[K],
    ): ModelDefinition[] {
      return Array.from(models.values()).filter(
        (m) => m.capabilities[capability] === value && m.status === 'available',
      );
    },

    has(id: string): boolean {
      return models.has(id);
    },
  };
}
