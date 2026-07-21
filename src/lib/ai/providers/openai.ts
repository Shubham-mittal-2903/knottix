import type { AIRequest, AIResponse, AIStreamChunk, ProviderConfig } from '../types';
import type { AIProvider } from './types';
import { AIError } from '../errors';

/**
 * Adapter-ready scaffold, not a complete implementation (per Sprint 3 scope: only one
 * provider — Anthropic — is fully wired). This registers cleanly with the Provider Registry,
 * reports real availability from the API key env var, and participates in health/fallback
 * checks, but `complete`/`stream` intentionally fail with a clear, retryable-false error until
 * the OpenAI Chat Completions request/response mapping is implemented (see IDEA-010).
 */
export function createOpenAIProvider(config: ProviderConfig): AIProvider {
  function apiKey(): string | undefined {
    return process.env[config.apiKeyEnvVar];
  }

  function notImplemented(): AIError {
    return AIError.providerUnavailable(
      config.id,
      `Provider "${config.id}" is registered and adapter-ready but not yet implemented — see IDEA-010`,
    );
  }

  return {
    id: config.id,
    name: config.name,
    config,

    isAvailable(): boolean {
      return Boolean(apiKey());
    },

    async complete(_request: AIRequest): Promise<AIResponse> {
      throw notImplemented();
    },

    async *stream(_request: AIRequest): AsyncIterable<AIStreamChunk> {
      yield { type: 'error', error: notImplemented().message };
    },
  };
}
