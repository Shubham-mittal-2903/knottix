export type WorkflowErrorCode =
  | 'WORKFLOW_NOT_FOUND'
  | 'DUPLICATE_KEY'
  | 'INVALID_DEFINITION'
  | 'STEP_NOT_FOUND'
  | 'HANDLER_NOT_REGISTERED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_NOT_FOUND'
  | 'CANCELLED'
  | 'ACCESS_DENIED';

export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: WorkflowErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.context = context;
  }

  static workflowNotFound(key: string): WorkflowError {
    return new WorkflowError('WORKFLOW_NOT_FOUND', `Workflow not found: ${key}`, { key });
  }

  static duplicateKey(key: string): WorkflowError {
    return new WorkflowError('DUPLICATE_KEY', `Workflow key already exists: ${key}`, { key });
  }

  static invalidDefinition(reason: string): WorkflowError {
    return new WorkflowError('INVALID_DEFINITION', `Invalid workflow definition: ${reason}`);
  }

  static stepNotFound(workflowKey: string, stepId: string): WorkflowError {
    return new WorkflowError('STEP_NOT_FOUND', `Step not found: ${stepId} in workflow ${workflowKey}`, {
      workflowKey,
      stepId,
    });
  }

  static handlerNotRegistered(stepType: string): WorkflowError {
    return new WorkflowError('HANDLER_NOT_REGISTERED', `No step handler registered for type: ${stepType}`, {
      stepType,
    });
  }

  static executionFailed(workflowKey: string, reason: string): WorkflowError {
    return new WorkflowError('EXECUTION_FAILED', `Workflow "${workflowKey}" execution failed: ${reason}`, {
      workflowKey,
    });
  }

  static executionNotFound(executionId: string): WorkflowError {
    return new WorkflowError('EXECUTION_NOT_FOUND', `Workflow execution not found: ${executionId}`, { executionId });
  }

  static cancelled(workflowKey: string): WorkflowError {
    return new WorkflowError('CANCELLED', `Workflow "${workflowKey}" execution was cancelled`, { workflowKey });
  }

  static accessDenied(key: string, reason?: string): WorkflowError {
    return new WorkflowError('ACCESS_DENIED', reason ?? `Access denied to workflow: ${key}`, { key });
  }
}

export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError;
}
