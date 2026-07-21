import type { EventBus } from '@/lib/kernel/types';
import type { WorkflowExecutionState, WorkflowStepResult } from '../types';
import { logger } from '@/lib/logger';

export const WORKFLOW_EVENTS = {
  STARTED: 'workflow.started',
  STEP_COMPLETED: 'workflow.step.completed',
  STEP_FAILED: 'workflow.step.failed',
  COMPLETED: 'workflow.completed',
  FAILED: 'workflow.failed',
  CANCELLED: 'workflow.cancelled',
} as const;

export interface WorkflowStartedPayload {
  execution: WorkflowExecutionState;
}

export interface WorkflowStepCompletedPayload {
  executionId: string;
  result: WorkflowStepResult;
}

export interface WorkflowStepFailedPayload {
  executionId: string;
  result: WorkflowStepResult;
}

export interface WorkflowCompletedPayload {
  execution: WorkflowExecutionState;
}

export interface WorkflowFailedPayload {
  execution: WorkflowExecutionState;
}

export interface WorkflowCancelledPayload {
  executionId: string;
}

export interface WorkflowEventEmitter {
  emitStarted(execution: WorkflowExecutionState): Promise<void>;
  emitStepCompleted(executionId: string, result: WorkflowStepResult): Promise<void>;
  emitStepFailed(executionId: string, result: WorkflowStepResult): Promise<void>;
  emitCompleted(execution: WorkflowExecutionState): Promise<void>;
  emitFailed(execution: WorkflowExecutionState): Promise<void>;
  emitCancelled(executionId: string): Promise<void>;
}

export function createWorkflowEventEmitter(eventBus: EventBus): WorkflowEventEmitter {
  const SOURCE = 'workflow-engine';

  async function emit(type: string, payload: unknown): Promise<void> {
    try {
      await eventBus.emit(type, payload, SOURCE);
    } catch (err) {
      logger.error('workflow.events', `Failed to emit event: ${type}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    async emitStarted(execution: WorkflowExecutionState): Promise<void> {
      await emit(WORKFLOW_EVENTS.STARTED, { execution } satisfies WorkflowStartedPayload);
    },

    async emitStepCompleted(executionId: string, result: WorkflowStepResult): Promise<void> {
      await emit(WORKFLOW_EVENTS.STEP_COMPLETED, { executionId, result } satisfies WorkflowStepCompletedPayload);
    },

    async emitStepFailed(executionId: string, result: WorkflowStepResult): Promise<void> {
      await emit(WORKFLOW_EVENTS.STEP_FAILED, { executionId, result } satisfies WorkflowStepFailedPayload);
    },

    async emitCompleted(execution: WorkflowExecutionState): Promise<void> {
      await emit(WORKFLOW_EVENTS.COMPLETED, { execution } satisfies WorkflowCompletedPayload);
    },

    async emitFailed(execution: WorkflowExecutionState): Promise<void> {
      await emit(WORKFLOW_EVENTS.FAILED, { execution } satisfies WorkflowFailedPayload);
    },

    async emitCancelled(executionId: string): Promise<void> {
      await emit(WORKFLOW_EVENTS.CANCELLED, { executionId } satisfies WorkflowCancelledPayload);
    },
  };
}
