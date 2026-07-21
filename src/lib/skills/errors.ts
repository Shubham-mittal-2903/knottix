export type SkillErrorCode = 'SKILL_NOT_FOUND' | 'DUPLICATE_KEY' | 'ACCESS_DENIED' | 'VALIDATION_FAILED';

export class SkillError extends Error {
  readonly code: SkillErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: SkillErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'SkillError';
    this.code = code;
    this.context = context;
  }

  static notFound(key: string): SkillError {
    return new SkillError('SKILL_NOT_FOUND', `Skill not found: ${key}`, { key });
  }

  static duplicateKey(key: string): SkillError {
    return new SkillError('DUPLICATE_KEY', `Skill key already exists: ${key}`, { key });
  }

  static accessDenied(key: string, reason?: string): SkillError {
    return new SkillError('ACCESS_DENIED', reason ?? `Access denied to skill: ${key}`, { key });
  }

  static validationFailed(key: string, reason: string): SkillError {
    return new SkillError('VALIDATION_FAILED', `Skill "${key}" is invalid: ${reason}`, { key });
  }
}

export function isSkillError(error: unknown): error is SkillError {
  return error instanceof SkillError;
}
