import type {
  AIRequest,
  AIResponse,
  AIRuntimeConfig,
  AIStreamChunk,
  ExecutionContext,
  ModelDefinition,
  PipelineMiddleware,
  ProviderConfig,
  StreamPipelineMiddleware,
} from '../types';
import type { AIProvider, ProviderFactory } from '../providers/types';
import { createProviderRegistry } from '../providers/registry';
import { createProviderResolver } from '../providers/resolver';
import { createProviderHealthMonitor } from '../providers/health';
import { createProviderFactory } from '../providers/factory';
import { createModelRegistry } from '../models/registry';
import { createRequestValidator, createResponseValidator } from '../validation';
import { createTokenTracker } from '../tracking/tokens';
import { createCostTracker } from '../tracking/cost';
import { createUsageTracker } from '../tracking/usage';
import { createRequestPipeline } from './pipeline';
import { createRetryStrategy } from './retry';
import { createFallbackStrategy } from './fallback';
import { createRateLimiter } from './rate-limiter';
import { createExecutionContext } from './context';
import type { ProviderHealthMonitorInterface } from '../providers/health';
import type { ProviderResolverInterface } from '../providers/resolver';
import type { ProviderFactoryInterface } from '../providers/factory';
import type { ProviderRegistryInterface } from '../providers/types';
import type { ModelRegistryInterface } from '../models/types';
import type { RequestPipeline } from './pipeline';
import type { TokenTracker } from '../tracking/tokens';
import type { CostTracker } from '../tracking/cost';
import type { UsageTracker, UsageSummary } from '../tracking/usage';
import type { RateLimiter } from './rate-limiter';
import { DEFAULT_RUNTIME_CONFIG } from '../config';
import { logger } from '@/lib/logger';

export interface AIRuntime {
  readonly providers: ProviderRegistryInterface;
  readonly models: ModelRegistryInterface;
  readonly health: ProviderHealthMonitorInterface;
  readonly providerFactory: ProviderFactoryInterface;
  readonly providerResolver: ProviderResolverInterface;
  readonly pipeline: RequestPipeline;
  readonly tokenTracker: TokenTracker;
  readonly costTracker: CostTracker;
  readonly usageTracker: UsageTracker;
  readonly rateLimiter: RateLimiter;

  complete(params: RuntimeRequestParams): Promise<AIResponse>;
  stream(params: RuntimeRequestParams): AsyncIterable<AIStreamChunk>;

  registerProvider(id: string, factory: ProviderFactory, config: ProviderConfig): void;
  registerModel(model: ModelDefinition): void;

  use(middleware: PipelineMiddleware): void;
  useStream(middleware: StreamPipelineMiddleware): void;

  getUsageSummary(): UsageSummary;
}

export interface RuntimeRequestParams {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  organizationId: string;
  userId: string;
  module: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export function createAIRuntime(config: Partial<AIRuntimeConfig> = {}): AIRuntime {
  const runtimeConfig: AIRuntimeConfig = { ...DEFAULT_RUNTIME_CONFIG, ...config };

  const providerRegistry = createProviderRegistry();
  const modelRegistry = createModelRegistry();
  const healthMonitor = createProviderHealthMonitor(providerRegistry);
  const providerResolver = createProviderResolver(providerRegistry, modelRegistry);
  const providerFactoryInstance = createProviderFactory(providerRegistry);
  const rateLimiter = createRateLimiter();

  const requestValidator = createRequestValidator(modelRegistry);
  const responseValidator = createResponseValidator();
  const tokenTracker = createTokenTracker();
  const costTracker = createCostTracker(modelRegistry);
  const usageTracker = createUsageTracker();
  const retryStrategy = createRetryStrategy({
    maxRetries: runtimeConfig.defaultMaxRetries,
    baseDelayMs: runtimeConfig.retryBaseDelayMs,
    maxDelayMs: runtimeConfig.retryMaxDelayMs,
  });
  const fallbackStrategy = createFallbackStrategy();

  const pipeline = createRequestPipeline({
    requestValidator,
    responseValidator,
    tokenTracker,
    costTracker,
    usageTracker,
    healthMonitor,
    retryStrategy,
    rateLimiter,
  });

  function buildRequest(params: RuntimeRequestParams): { request: AIRequest; context: ExecutionContext } {
    const context = createExecutionContext({
      organizationId: params.organizationId,
      userId: params.userId,
      module: params.module,
      signal: params.signal,
      metadata: params.metadata,
    });

    const request: AIRequest = {
      requestId: context.requestId,
      model: params.model ?? runtimeConfig.defaultModel,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      stop: params.stop,
      stream: false,
      signal: params.signal,
      metadata: params.metadata,
    };

    return { request, context };
  }

  const runtime: AIRuntime = {
    providers: providerRegistry,
    models: modelRegistry,
    health: healthMonitor,
    providerFactory: providerFactoryInstance,
    providerResolver: providerResolver,
    pipeline,
    tokenTracker,
    costTracker,
    usageTracker,
    rateLimiter,

    async complete(params: RuntimeRequestParams): Promise<AIResponse> {
      const { request, context } = buildRequest(params);
      const modelId = request.model;

      let provider: AIProvider;
      try {
        provider = providerResolver.resolveForModel(modelId);
      } catch {
        provider = providerResolver.resolveWithFallback(modelId);
      }

      const timeoutMs = providerRegistry.resolve(provider.id).config.timeoutMs ?? runtimeConfig.defaultTimeoutMs;

      try {
        return await pipeline.execute(request, context, provider, timeoutMs);
      } catch (error) {
        const fallbackProviders = getFallbackProviders(provider.id);
        if (fallbackProviders.length > 0) {
          return fallbackStrategy.execute(request, provider, fallbackProviders);
        }
        throw error;
      }
    },

    async *stream(params: RuntimeRequestParams): AsyncIterable<AIStreamChunk> {
      const { request, context } = buildRequest(params);
      request.stream = true;

      const modelId = request.model;
      const provider = providerResolver.resolveForModel(modelId);

      yield* pipeline.executeStream(request, context, provider);
    },

    registerProvider(id: string, factory: ProviderFactory, providerConfig: ProviderConfig): void {
      providerFactoryInstance.registerFactory(id, factory);
      providerRegistry.register(id, factory, providerConfig);

      if (providerConfig.rateLimitRpm) {
        rateLimiter.configure(id, providerConfig.rateLimitRpm);
      }

      logger.info('ai.runtime', `Provider registered: ${id}`);
    },

    registerModel(model: ModelDefinition): void {
      modelRegistry.register(model);
    },

    use(middleware: PipelineMiddleware): void {
      pipeline.use(middleware);
    },

    useStream(middleware: StreamPipelineMiddleware): void {
      pipeline.useStream(middleware);
    },

    getUsageSummary(): UsageSummary {
      return usageTracker.getSummary();
    },
  };

  function getFallbackProviders(excludeId: string): AIProvider[] {
    return providerRegistry
      .list()
      .filter((id) => id !== excludeId)
      .map((id) => providerRegistry.get(id))
      .filter((p): p is AIProvider => p !== undefined && p.isAvailable())
      .filter((p) => healthMonitor.getStatus(p.id) !== 'unavailable');
  }

  return runtime;
}
