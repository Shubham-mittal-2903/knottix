export type ToolErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'DUPLICATE_TOOL'
  | 'ACCESS_DENIED'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'TOOL_INACTIVE'
  | 'TIMEOUT'
  | 'CANCELLED';

export class ToolError extends Error {
  readonly code: ToolErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: ToolErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.context = context;
  }

  static toolNotFound(name: string): ToolError {
    return new ToolError('TOOL_NOT_FOUND', `Tool not found: ${name}`, { name });
  }

  static duplicateTool(name: string): ToolError {
    return new ToolError('DUPLICATE_TOOL', `Tool already registered: ${name}`, { name });
  }

  static accessDenied(name: string, reason?: string): ToolError {
    return new ToolError('ACCESS_DENIED', reason ?? `Access denied to tool: ${name}`, { name });
  }

  static validationFailed(name: string, errors: string[]): ToolError {
    return new ToolError('VALIDATION_FAILED', `Invalid input for tool "${name}": ${errors.join(', ')}`, {
      name,
      errors,
    });
  }

  static executionFailed(name: string, reason: string): ToolError {
    return new ToolError('EXECUTION_FAILED', `Tool "${name}" execution failed: ${reason}`, { name });
  }

  static toolInactive(name: string): ToolError {
    return new ToolError('TOOL_INACTIVE', `Tool is inactive: ${name}`, { name });
  }

  static timeout(name: string, timeoutMs: number): ToolError {
    return new ToolError('TIMEOUT', `Tool "${name}" timed out after ${timeoutMs}ms`, { name, timeoutMs });
  }

  static cancelled(name: string): ToolError {
    return new ToolError('CANCELLED', `Tool "${name}" execution was cancelled`, { name });
  }
}

export function isToolError(error: unknown): error is ToolError {
  return error instanceof ToolError;
}
