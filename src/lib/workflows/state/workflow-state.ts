import type { WorkflowExecutionState, WorkflowExecutionStatus, WorkflowStepResult } from '../types';
import { WorkflowError } from '../errors';

let executionCounter = 0;
function generateExecutionId(): string {
  executionCounter += 1;
  return `wfexec_${Date.now()}_${executionCounter}`;
}

export interface WorkflowStateManager {
  createExecution(workflowId: string, workflowKey: string, organizationId: string, variables: Record<string, unknown>): WorkflowExecutionState;
  getExecution(executionId: string): WorkflowExecutionState;
  setStatus(executionId: string, status: WorkflowExecutionStatus): void;
  setCurrentStep(executionId: string, stepId: string | null): void;
  appendStepResult(executionId: string, result: WorkflowStepResult): void;
  setVariable(executionId: string, key: string, value: unknown): void;
  complete(executionId: string): void;
  fail(executionId: string, error: string): void;
  listByWorkflow(workflowId: string): WorkflowExecutionState[];
  /** Injects an execution state reconstructed from persisted storage (a real database row) — used
   *  only by `WorkflowExecutor.resume()`'s rehydration path, when a paused execution's in-memory
   *  presence was lost (e.g. a server restart). Overwrites any existing in-memory entry for the
   *  same `executionId`, since the persisted row is the authoritative source once memory is gone. */
  seed(state: WorkflowExecutionState): void;
}

export function createWorkflowStateManager(): WorkflowStateManager {
  const executions = new Map<string, WorkflowExecutionState>();

  function requireExecution(executionId: string): WorkflowExecutionState {
    const state = executions.get(executionId);
    if (!state) throw WorkflowError.executionNotFound(executionId);
    return state;
  }

  return {
    createExecution(
      workflowId: string,
      workflowKey: string,
      organizationId: string,
      variables: Record<string, unknown>,
    ): WorkflowExecutionState {
      const state: WorkflowExecutionState = {
        executionId: generateExecutionId(),
        workflowId,
        workflowKey,
        organizationId,
        status: 'PENDING',
        currentStepId: null,
        stepResults: [],
        variables: { ...variables },
        startedAt: Date.now(),
        completedAt: null,
        error: null,
      };
      executions.set(state.executionId, state);
      return state;
    },

    getExecution(executionId: string): WorkflowExecutionState {
      const state = requireExecution(executionId);
      return { ...state, stepResults: [...state.stepResults] };
    },

    setStatus(executionId: string, status: WorkflowExecutionStatus): void {
      requireExecution(executionId).status = status;
    },

    setCurrentStep(executionId: string, stepId: string | null): void {
      requireExecution(executionId).currentStepId = stepId;
    },

    appendStepResult(executionId: string, result: WorkflowStepResult): void {
      requireExecution(executionId).stepResults.push(result);
    },

    setVariable(executionId: string, key: string, value: unknown): void {
      requireExecution(executionId).variables[key] = value;
    },

    complete(executionId: string): void {
      const state = requireExecution(executionId);
      state.status = 'COMPLETED';
      state.completedAt = Date.now();
      state.currentStepId = null;
    },

    fail(executionId: string, error: string): void {
      const state = requireExecution(executionId);
      state.status = 'FAILED';
      state.completedAt = Date.now();
      state.error = error;
    },

    listByWorkflow(workflowId: string): WorkflowExecutionState[] {
      return Array.from(executions.values()).filter((e) => e.workflowId === workflowId);
    },

    seed(state: WorkflowExecutionState): void {
      executions.set(state.executionId, { ...state, stepResults: [...state.stepResults] });
    },
  };
}
