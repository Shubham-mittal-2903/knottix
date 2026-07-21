import type { AIRequest, AIResponse, AIStreamChunk, ExecutionContext, PipelineMiddleware, StreamPipelineMiddleware } from '../types';
import type { AIProvider } from '../providers/types';
import type { ProviderHealthMonitorInterface } from '../providers/health';
import type { RequestValidator, ResponseValidator } from '../validation';
import type { TokenTracker } from '../tracking/tokens';
import type { CostTracker } from '../tracking/cost';
import type { UsageTracker } from '../tracking/usage';
import type { RetryStrategy } from './retry';
import type { RateLimiter } from './rate-limiter';
import { checkRateLimit } from './rate-limiter';
import { checkCancellation, withTimeout } from './cancellation';
import { createStreamAccumulator } from './streaming';
import { AIError } from '../errors';
import { logger } from '@/lib/logger';

export interface RequestPipeline {
  execute(request: AIRequest, context: ExecutionContext, provider: AIProvider, timeoutMs: number): Promise<AIResponse>;
  executeStream(request: AIRequest, context: ExecutionContext, provider: AIProvider): AsyncIterable<AIStreamChunk>;
  use(middleware: PipelineMiddleware): void;
  useStream(middleware: StreamPipelineMiddleware): void;
}

export function createRequestPipeline(deps: {
  requestValidator: RequestValidator;
  responseValidator: ResponseValidator;
  tokenTracker: TokenTracker;
  costTracker: CostTracker;
  usageTracker: UsageTracker;
  healthMonitor: ProviderHealthMonitorInterface;
  retryStrategy: RetryStrategy;
  rateLimiter: RateLimiter;
}): RequestPipeline {
  const middlewares: PipelineMiddleware[] = [];
  const streamMiddlewares: StreamPipelineMiddleware[] = [];

  function buildChain(
    request: AIRequest,
    context: ExecutionContext,
    provider: AIProvider,
    timeoutMs: number,
  ): () => Promise<AIResponse> {
    let index = 0;

    const next = (): Promise<AIResponse> => {
      if (index < middlewares.length) {
        const mw = middlewares[index++];
        return mw(request, context, next);
      }
      return executeCore(request, context, provider, timeoutMs);
    };

    return next;
  }

  async function executeCore(
    request: AIRequest,
    context: ExecutionContext,
    provider: AIProvider,
    timeoutMs: number,
  ): Promise<AIResponse> {
    checkCancellation(context.signal);
    checkRateLimit(deps.rateLimiter, provider.id);

    const startTime = Date.now();
    let response: AIResponse;

    try {
      response = await deps.retryStrategy.execute(
        () => withTimeout(provider.complete(request), timeoutMs, provider.id),
        `${provider.id}:complete`,
      );
    } catch (error) {
      deps.healthMonitor.recordFailure(provider.id, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    const latencyMs = Date.now() - startTime;
    response.latencyMs = latencyMs;

    deps.healthMonitor.recordSuccess(provider.id, latencyMs);
    deps.responseValidator.validate(response);

    deps.tokenTracker.record(request.requestId, request.model, response.usage);
    deps.costTracker.record(request.requestId, request.model, response.usage);
    deps.usageTracker.record({
      requestId: request.requestId,
      providerId: provider.id,
      model: request.model,
      usage: response.usage,
      costUsd: deps.costTracker.calculate(request.model, response.usage),
      latencyMs,
      timestamp: Date.now(),
      organizationId: context.organizationId,
      userId: context.userId,
      module: context.module,
      success: true,
    });

    return response;
  }

  return {
    async execute(
      request: AIRequest,
      context: ExecutionContext,
      provider: AIProvider,
      timeoutMs: number,
    ): Promise<AIResponse> {
      deps.requestValidator.validate(request);
      checkCancellation(context.signal);

      const chain = buildChain(request, context, provider, timeoutMs);
      return chain();
    },

    async *executeStream(
      request: AIRequest,
      context: ExecutionContext,
      provider: AIProvider,
    ): AsyncIterable<AIStreamChunk> {
      deps.requestValidator.validate(request);
      checkCancellation(context.signal);
      checkRateLimit(deps.rateLimiter, provider.id);

      const startTime = Date.now();
      const accumulator = createStreamAccumulator();

      let innerStream: AsyncIterable<AIStreamChunk>;
      try {
        innerStream = provider.stream(request);
      } catch (error) {
        deps.healthMonitor.recordFailure(provider.id, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      let currentStream: AsyncIterable<AIStreamChunk> = innerStream;
      for (const mw of streamMiddlewares) {
        const prev = currentStream;
        currentStream = mw(request, context, () => prev);
      }

      try {
        for await (const chunk of currentStream) {
          checkCancellation(context.signal);
          accumulator.push(chunk);
          yield chunk;

          if (chunk.type === 'error') {
            throw AIError.streamingFailed(provider.id, chunk.error);
          }
        }

        const latencyMs = Date.now() - startTime;
        deps.healthMonitor.recordSuccess(provider.id, latencyMs);

        const usage = accumulator.getUsage();
        if (usage) {
          deps.tokenTracker.record(request.requestId, request.model, usage);
          deps.costTracker.record(request.requestId, request.model, usage);
          deps.usageTracker.record({
            requestId: request.requestId,
            providerId: provider.id,
            model: request.model,
            usage,
            costUsd: deps.costTracker.calculate(request.model, usage),
            latencyMs,
            timestamp: Date.now(),
            organizationId: context.organizationId,
            userId: context.userId,
            module: context.module,
            success: true,
          });
        }
      } catch (error) {
        deps.healthMonitor.recordFailure(provider.id, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },

    use(middleware: PipelineMiddleware): void {
      middlewares.push(middleware);
    },

    useStream(middleware: StreamPipelineMiddleware): void {
      streamMiddlewares.push(middleware);
    },
  };
}
