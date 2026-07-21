import type { WorkflowExecutionStatus, WorkflowStatus } from '@/types/database';

export type { WorkflowExecutionStatus, WorkflowStatus };

export type WorkflowStepType = 'tool' | 'agent' | 'prompt' | 'condition' | 'transform';

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  onSuccess?: string;
  onFailure?: string;
}

export interface WorkflowDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  steps: WorkflowStepDefinition[];
  startStepId: string;
  organizationId: string | null;
  status: WorkflowStatus;
  version: number;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkflowInput {
  key: string;
  name: string;
  description: string;
  steps: WorkflowStepDefinition[];
  startStepId: string;
  organizationId?: string | null;
  createdBy?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  steps?: WorkflowStepDefinition[];
  startStepId?: string;
  status?: WorkflowStatus;
  updatedBy?: string;
}

export interface WorkflowFilter {
  organizationId?: string | null;
  status?: WorkflowStatus;
  search?: string;
}

export interface WorkflowContext {
  requestId: string;
  organizationId: string;
  workspaceId: string | null;
  userId: string;
  variables: Record<string, unknown>;
  signal?: AbortSignal;
  /** isFounder/permissions of the acting user — additive, needed by the core 'tool'/'agent' step
   *  handlers (`src/lib/workflows/step-handlers.ts`) to build a real `ToolAccessContext`/
   *  `AgentAccessContext` without the Workflow Foundation itself knowing about RBAC shapes. */
  accessContext?: { isFounder: boolean; permissions: string[] };
  /** Typed `unknown` here deliberately — the Workflow Foundation must not depend on
   *  `@/lib/intelligence` (that module already depends on `workflows`, so importing its
   *  `IntelligenceContext` type here would create a cycle). `step-handlers.ts`, which already
   *  imports from `@/lib/intelligence`, casts this back for 'agent' steps. */
  intelligenceContext?: unknown;
}

export type WorkflowStepStatus = 'completed' | 'failed' | 'skipped' | 'waiting_confirmation';

export interface WorkflowStepResult {
  stepId: string;
  stepName: string;
  stepType: WorkflowStepType;
  status: WorkflowStepStatus;
  output?: unknown;
  error?: string;
  /** Number of attempts actually made for this step (1 unless `step.config.retry.maxAttempts` > 1). */
  attempts?: number;
  startedAt: number;
  completedAt: number;
}

/** Optional retry config a step can declare in `config.retry` — re-runs the same step handler up
 *  to `maxAttempts` times before the step is considered failed, for transient failures (network
 *  blips, a flaky dev-server start). Distinct from the Goal Execution Engine's self-correction
 *  loops, which express "diagnose, repair, retry" as real graph edges (a prompt/agent step on
 *  `onFailure` looping back), not a bare re-run. */
export interface WorkflowStepRetryConfig {
  maxAttempts?: number;
}

export interface WorkflowExecutionState {
  executionId: string;
  workflowId: string;
  workflowKey: string;
  organizationId: string;
  status: WorkflowExecutionStatus;
  currentStepId: string | null;
  stepResults: WorkflowStepResult[];
  variables: Record<string, unknown>;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export type WorkflowStepHandler = (step: WorkflowStepDefinition, context: WorkflowContext) => Promise<unknown>;

export interface ExecuteWorkflowInput {
  workflowKey: string;
  organizationId: string;
  context: WorkflowContext;
  initialVariables?: Record<string, unknown>;
}
