import type { ExecutionContext } from '../types';

let requestCounter = 0;

export function generateRequestId(): string {
  requestCounter += 1;
  return `ai_${Date.now()}_${requestCounter}`;
}

export function createExecutionContext(params: {
  organizationId: string;
  userId: string;
  module: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}): ExecutionContext {
  return {
    requestId: generateRequestId(),
    organizationId: params.organizationId,
    userId: params.userId,
    module: params.module,
    startTime: Date.now(),
    signal: params.signal,
    metadata: params.metadata,
  };
}
