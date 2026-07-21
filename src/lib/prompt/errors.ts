export type PromptErrorCode =
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_INACTIVE'
  | 'DUPLICATE_KEY'
  | 'VALIDATION_FAILED'
  | 'RENDER_FAILED'
  | 'VERSION_NOT_FOUND'
  | 'ACCESS_DENIED';

export class PromptError extends Error {
  readonly code: PromptErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: PromptErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'PromptError';
    this.code = code;
    this.context = context;
  }

  static templateNotFound(key: string): PromptError {
    return new PromptError('TEMPLATE_NOT_FOUND', `Prompt template not found: ${key}`, { key });
  }

  static templateInactive(key: string): PromptError {
    return new PromptError('TEMPLATE_INACTIVE', `Prompt template is inactive: ${key}`, { key });
  }

  static duplicateKey(key: string): PromptError {
    return new PromptError('DUPLICATE_KEY', `Prompt template key already exists: ${key}`, { key });
  }

  static validationFailed(message: string, errors?: string[]): PromptError {
    return new PromptError('VALIDATION_FAILED', message, errors ? { errors } : undefined);
  }

  static renderFailed(key: string, reason: string): PromptError {
    return new PromptError('RENDER_FAILED', `Failed to render prompt "${key}": ${reason}`, { key });
  }

  static versionNotFound(templateId: string, version: number): PromptError {
    return new PromptError('VERSION_NOT_FOUND', `Prompt version not found: ${templateId}@v${version}`, {
      templateId,
      version,
    });
  }

  static accessDenied(key: string, reason?: string): PromptError {
    return new PromptError('ACCESS_DENIED', reason ?? `Access denied to prompt template: ${key}`, { key });
  }
}

export function isPromptError(error: unknown): error is PromptError {
  return error instanceof PromptError;
}
