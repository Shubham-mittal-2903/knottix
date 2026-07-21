import type { AIRequest, AIResponse } from '../types';
import type { AIProvider } from '../providers/types';
import { logger } from '@/lib/logger';

export interface FallbackStrategy {
  execute(
    request: AIRequest,
    primaryProvider: AIProvider,
    fallbackProviders: AIProvider[],
  ): Promise<AIResponse>;
}

export function createFallbackStrategy(): FallbackStrategy {
  return {
    async execute(
      request: AIRequest,
      primaryProvider: AIProvider,
      fallbackProviders: AIProvider[],
    ): Promise<AIResponse> {
      try {
        return await primaryProvider.complete(request);
      } catch (primaryError) {
        if (fallbackProviders.length === 0) throw primaryError;

        logger.warn('ai.fallback', `Primary provider ${primaryProvider.id} failed, trying fallbacks`, {
          error: primaryError instanceof Error ? primaryError.message : String(primaryError),
          fallbackCount: fallbackProviders.length,
        });

        for (const fallback of fallbackProviders) {
          if (!fallback.isAvailable()) continue;

          try {
            logger.info('ai.fallback', `Attempting fallback provider: ${fallback.id}`);
            return await fallback.complete(request);
          } catch (fallbackError) {
            logger.warn('ai.fallback', `Fallback provider ${fallback.id} also failed`, {
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });
          }
        }

        throw primaryError;
      }
    },
  };
}
