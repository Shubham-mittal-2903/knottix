import type { AIRequest, AIResponse } from './types';
import { AIError } from './errors';
import type { ModelRegistryInterface } from './models/types';

export interface RequestValidator {
  validate(request: AIRequest): void;
}

export interface ResponseValidator {
  validate(response: AIResponse): void;
}

export function createRequestValidator(modelRegistry: ModelRegistryInterface): RequestValidator {
  return {
    validate(request: AIRequest): void {
      if (!request.model) {
        throw AIError.invalidRequest('Model is required');
      }

      if (!request.messages || request.messages.length === 0) {
        throw AIError.invalidRequest('At least one message is required');
      }

      for (const message of request.messages) {
        if (!message.role || !message.content) {
          throw AIError.invalidRequest('Each message must have a role and content');
        }
        if (!['system', 'user', 'assistant'].includes(message.role)) {
          throw AIError.invalidRequest(`Invalid message role: ${message.role}`);
        }
      }

      if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
        throw AIError.invalidRequest('Temperature must be between 0 and 2');
      }

      if (request.maxTokens !== undefined && request.maxTokens < 1) {
        throw AIError.invalidRequest('maxTokens must be at least 1');
      }

      const model = modelRegistry.get(request.model);
      if (model) {
        if (model.status === 'unavailable') {
          throw AIError.modelUnavailable(request.model, model.providerId);
        }

        if (request.maxTokens && request.maxTokens > model.maxOutputTokens) {
          throw AIError.invalidRequest(
            `maxTokens (${request.maxTokens}) exceeds model maximum (${model.maxOutputTokens})`,
          );
        }

        if (request.stream && !model.capabilities.streaming) {
          throw AIError.invalidRequest(`Model ${request.model} does not support streaming`);
        }
      }
    },
  };
}

export function createResponseValidator(): ResponseValidator {
  return {
    validate(response: AIResponse): void {
      if (!response.providerId) {
        throw AIError.invalidResponse('unknown', 'Response missing providerId');
      }

      if (!response.model) {
        throw AIError.invalidResponse(response.providerId, 'Response missing model');
      }

      if (response.content === undefined || response.content === null) {
        throw AIError.invalidResponse(response.providerId, 'Response missing content');
      }

      if (!response.usage) {
        throw AIError.invalidResponse(response.providerId, 'Response missing usage data');
      }
    },
  };
}
