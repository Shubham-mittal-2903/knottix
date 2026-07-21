export type AIErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH_FAILED'
  | 'MODEL_NOT_FOUND'
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'STREAMING_FAILED'
  | 'CONTENT_FILTERED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'PROVIDER_ERROR';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly providerId: string | null;
  readonly model: string | null;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;

  constructor(
    code: AIErrorCode,
    message: string,
    options: {
      providerId?: string;
      model?: string;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.providerId = options.providerId ?? null;
    this.model = options.model ?? null;
    this.retryable = options.retryable ?? false;
    this.context = options.context;
  }

  static providerUnavailable(providerId: string, message?: string): AIError {
    return new AIError('PROVIDER_UNAVAILABLE', message ?? `Provider unavailable: ${providerId}`, {
      providerId,
      retryable: true,
    });
  }

  static authFailed(providerId: string): AIError {
    return new AIError('PROVIDER_AUTH_FAILED', `Authentication failed for provider: ${providerId}`, {
      providerId,
      retryable: false,
    });
  }

  static modelNotFound(model: string): AIError {
    return new AIError('MODEL_NOT_FOUND', `Model not found: ${model}`, {
      model,
      retryable: false,
    });
  }

  static modelUnavailable(model: string, providerId: string): AIError {
    return new AIError('MODEL_UNAVAILABLE', `Model unavailable: ${model}`, {
      model,
      providerId,
      retryable: true,
    });
  }

  static rateLimited(providerId: string, retryAfterMs?: number): AIError {
    return new AIError('RATE_LIMITED', `Rate limited by provider: ${providerId}`, {
      providerId,
      retryable: true,
      context: retryAfterMs ? { retryAfterMs } : undefined,
    });
  }

  static quotaExceeded(providerId: string): AIError {
    return new AIError('QUOTA_EXCEEDED', `Quota exceeded for provider: ${providerId}`, {
      providerId,
      retryable: false,
    });
  }

  static timeout(providerId: string, timeoutMs: number): AIError {
    return new AIError('TIMEOUT', `Request timed out after ${timeoutMs}ms`, {
      providerId,
      retryable: true,
      context: { timeoutMs },
    });
  }

  static cancelled(): AIError {
    return new AIError('CANCELLED', 'Request was cancelled', { retryable: false });
  }

  static invalidRequest(message: string): AIError {
    return new AIError('INVALID_REQUEST', message, { retryable: false });
  }

  static invalidResponse(providerId: string, message: string): AIError {
    return new AIError('INVALID_RESPONSE', message, { providerId, retryable: true });
  }

  static streamingFailed(providerId: string, message?: string): AIError {
    return new AIError('STREAMING_FAILED', message ?? `Streaming failed for provider: ${providerId}`, {
      providerId,
      retryable: true,
    });
  }

  static contentFiltered(providerId: string): AIError {
    return new AIError('CONTENT_FILTERED', 'Content was filtered by the provider', {
      providerId,
      retryable: false,
    });
  }

  static contextLengthExceeded(model: string, maxTokens: number): AIError {
    return new AIError('CONTEXT_LENGTH_EXCEEDED', `Context length exceeded for model ${model} (max: ${maxTokens})`, {
      model,
      retryable: false,
      context: { maxTokens },
    });
  }

  static providerError(providerId: string, message: string): AIError {
    return new AIError('PROVIDER_ERROR', message, { providerId, retryable: true });
  }
}

export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}

export function isRetryableAIError(error: unknown): boolean {
  return isAIError(error) && error.retryable;
}
