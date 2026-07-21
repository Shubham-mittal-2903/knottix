export type AgentErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'DUPLICATE_KEY'
  | 'ACCESS_DENIED'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'INVALID_STATE'
  | 'TOOL_NOT_ALLOWED'
  | 'AGENT_INACTIVE';

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: AgentErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.context = context;
  }

  static agentNotFound(key: string): AgentError {
    return new AgentError('AGENT_NOT_FOUND', `Agent not found: ${key}`, { key });
  }

  static duplicateKey(key: string): AgentError {
    return new AgentError('DUPLICATE_KEY', `Agent key already exists: ${key}`, { key });
  }

  static accessDenied(key: string, reason?: string): AgentError {
    return new AgentError('ACCESS_DENIED', reason ?? `Access denied to agent: ${key}`, { key });
  }

  static validationFailed(message: string, errors?: string[]): AgentError {
    return new AgentError('VALIDATION_FAILED', message, errors ? { errors } : undefined);
  }

  static executionFailed(key: string, reason: string): AgentError {
    return new AgentError('EXECUTION_FAILED', `Agent "${key}" execution failed: ${reason}`, { key });
  }

  static invalidState(key: string, from: string, to: string): AgentError {
    return new AgentError('INVALID_STATE', `Agent "${key}" cannot transition from ${from} to ${to}`, {
      key,
      from,
      to,
    });
  }

  static toolNotAllowed(agentKey: string, toolName: string): AgentError {
    return new AgentError('TOOL_NOT_ALLOWED', `Agent "${agentKey}" is not allowed to use tool: ${toolName}`, {
      agentKey,
      toolName,
    });
  }

  static agentInactive(key: string): AgentError {
    return new AgentError('AGENT_INACTIVE', `Agent is not ready: ${key}`, { key });
  }
}

export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError;
}
