import type { WorkflowExecutionState } from '../types';

export interface WorkflowHistoryStore {
  /** Upserts by `executionId` — called on pause (WAITING_CONFIRMATION) as well as on completion/
   *  failure (see `workflow-executor.ts`), so calling it more than once for the same execution
   *  must replace the prior snapshot, never leave a stale duplicate `getById` could return. */
  record(execution: WorkflowExecutionState): void;
  getById(executionId: string): WorkflowExecutionState | null;
  listByWorkflow(workflowId: string, limit?: number): WorkflowExecutionState[];
  listByOrganization(organizationId: string, limit?: number): WorkflowExecutionState[];
  /** Optional — only the Prisma-backed decorator (`workflow-persistence.ts`) implements this,
   *  doing a real direct database lookup rather than relying on whatever a bounded `hydrate()`
   *  pass happened to load into memory. Used by `WorkflowExecutor.resume()`'s rehydration path so
   *  a paused execution can be recovered even after a full process restart. */
  getByIdRemote?(executionId: string): Promise<WorkflowExecutionState | null>;
}

export function createWorkflowHistoryStore(): WorkflowHistoryStore {
  const history: WorkflowExecutionState[] = [];

  return {
    record(execution: WorkflowExecutionState): void {
      const snapshot = { ...execution, stepResults: [...execution.stepResults] };
      const index = history.findIndex((e) => e.executionId === execution.executionId);
      if (index >= 0) history[index] = snapshot;
      else history.push(snapshot);
    },

    getById(executionId: string): WorkflowExecutionState | null {
      const found = history.find((e) => e.executionId === executionId);
      return found ? { ...found } : null;
    },

    listByWorkflow(workflowId: string, limit = 50): WorkflowExecutionState[] {
      return history
        .filter((e) => e.workflowId === workflowId)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, limit);
    },

    listByOrganization(organizationId: string, limit = 50): WorkflowExecutionState[] {
      return history
        .filter((e) => e.organizationId === organizationId)
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, limit);
    },
  };
}
