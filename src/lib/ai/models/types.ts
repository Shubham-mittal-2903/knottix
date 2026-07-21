import type { ModelCapabilities, ModelDefinition } from '../types';

export interface ModelRegistryInterface {
  register(model: ModelDefinition): void;
  get(id: string): ModelDefinition | undefined;
  resolve(id: string): ModelDefinition;
  list(): ModelDefinition[];
  listByProvider(providerId: string): ModelDefinition[];
  findByCapability<K extends keyof ModelCapabilities>(
    capability: K,
    value: ModelCapabilities[K],
  ): ModelDefinition[];
  has(id: string): boolean;
}
