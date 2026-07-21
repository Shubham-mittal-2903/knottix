import type { AIRequest, AIResponse, AIStreamChunk, ProviderConfig, ProviderHealth } from '../types';

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly config: ProviderConfig;
  complete(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIStreamChunk>;
  isAvailable(): boolean;
}

export type ProviderFactory = (config: ProviderConfig) => AIProvider;

export interface ProviderRegistryInterface {
  register(id: string, factory: ProviderFactory, config: ProviderConfig): void;
  get(id: string): AIProvider | undefined;
  resolve(id: string): AIProvider;
  list(): string[];
  has(id: string): boolean;
  getHealth(id: string): ProviderHealth;
  updateHealth(id: string, update: Partial<ProviderHealth>): void;
}
