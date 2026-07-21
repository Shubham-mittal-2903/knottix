import { isRetryableAIError } from '../errors';
import { logger } from '@/lib/logger';

export interface RetryStrategy {
  execute<T>(fn: () => Promise<T>, label: string): Promise<T>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export function createRetryStrategy(config: RetryConfig): RetryStrategy {
  function computeDelay(attempt: number): number {
    const delay = config.baseDelayMs * Math.pow(2, attempt);
    const jitter = delay * 0.1 * Math.random();
    return Math.min(delay + jitter, config.maxDelayMs);
  }

  return {
    async execute<T>(fn: () => Promise<T>, label: string): Promise<T> {
      let lastError: unknown;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;

          if (attempt === config.maxRetries) break;
          if (!isRetryableAIError(error)) throw error;

          const delay = computeDelay(attempt);
          logger.warn('ai.retry', `Retrying ${label} (attempt ${attempt + 1}/${config.maxRetries})`, {
            delayMs: delay,
            error: error instanceof Error ? error.message : String(error),
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    },
  };
}
