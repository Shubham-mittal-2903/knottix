import type {
  ExecuteWorkflowInput,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionState,
  WorkflowStepDefinition,
  WorkflowStepHandler,
  WorkflowStepResult,
  WorkflowStepRetryConfig,
  WorkflowStepType,
} from '../types';
import type { WorkflowRegistry } from '../registry/workflow-registry';
import type { WorkflowStateManager } from '../state/workflow-state';
import type { WorkflowHistoryStore } from '../history/workflow-history';
import type { WorkflowEventEmitter } from '../events/workflow-events';
import { WorkflowError } from '../errors';
import { logger } from '@/lib/logger';

const MAX_STEPS_PER_EXECUTION = 200;

/** Thrown by a step handler (typically the 'tool' handler in `step-handlers.ts`) to signal that
 *  the step's underlying tool has `metadata.requiresConfirmation` and hasn't been confirmed yet —
 *  the executor catches this specially and pauses the execution instead of failing it. */
export class WorkflowConfirmationRequired extends Error {
  constructor(
    public readonly stepId: string,
    reason: string,
  ) {
    super(reason);
    this.name = 'WorkflowConfirmationRequired';
  }
}

/** Shared key convention between the executor (which checks it before re-running a step on
 *  resume) and `step-handlers.ts`'s 'tool' handler (which sets it once confirmed). */
export function confirmationVariableKey(stepId: string): string {
  return `__confirm_${stepId}`;
}

function evaluateCondition(config: Record<string, unknown>, variables: Record<string, unknown>): boolean {
  const { variable, operator, value } = config as { variable?: string; operator?: string; value?: unknown };
  if (!variable || !operator) return false;

  const actual = variables[variable];

  switch (operator) {
    case 'eq':
      return actual === value;
    case 'neq':
      return actual !== value;
    case 'gt':
      return typeof actual === 'number' && typeof value === 'number' && actual > value;
    case 'lt':
      return typeof actual === 'number' && typeof value === 'number' && actual < value;
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'truthy':
      return Boolean(actual);
    default:
      return false;
  }
}

export interface WorkflowExecutor {
  registerStepHandler(type: WorkflowStepType, handler: WorkflowStepHandler): void;
  execute(input: ExecuteWorkflowInput): Promise<WorkflowExecutionState>;
  /** Resumes an execution that's paused with status WAITING_CONFIRMATION. `confirm: false` treats
   *  the paused step as declined (routes via its `onFailure` edge, or fails the execution if none).
   *  `context` is only actually used when the in-memory paused closure was lost (a server restart)
   *  — see the rehydration path below — so callers must always be ready to supply a freshly-built
   *  one even though the common (same-process) case ignores it. */
  resume(executionId: string, confirm: boolean, context: WorkflowContext): Promise<WorkflowExecutionState>;
}

interface PausedExecution {
  workflow: WorkflowDefinition;
  stepsById: Map<string, WorkflowStepDefinition>;
  context: WorkflowContext;
}

export function createWorkflowExecutor(deps: {
  registry: WorkflowRegistry;
  stateManager: WorkflowStateManager;
  historyStore: WorkflowHistoryStore;
  events: WorkflowEventEmitter;
}): WorkflowExecutor {
  const stepHandlers = new Map<WorkflowStepType, WorkflowStepHandler>();
  const pausedExecutions = new Map<string, PausedExecution>();

  stepHandlers.set('condition', async (step, context) => {
    return evaluateCondition(step.config, context.variables);
  });

  stepHandlers.set('transform', async (step, context) => {
    const { assign } = step.config as { assign?: Record<string, unknown> };
    if (assign) {
      for (const [key, value] of Object.entries(assign)) {
        context.variables[key] = value;
      }
    }
    return context.variables;
  });

  function resolveNextStep(step: WorkflowStepDefinition, succeeded: boolean): string | null {
    return succeeded ? step.onSuccess ?? null : step.onFailure ?? null;
  }

  async function runStep(
    workflow: WorkflowDefinition,
    step: WorkflowStepDefinition,
    context: WorkflowContext,
  ): Promise<WorkflowStepResult> {
    const handler = stepHandlers.get(step.type);
    if (!handler) {
      throw WorkflowError.handlerNotRegistered(step.type);
    }

    const startedAt = Date.now();
    if (context.signal?.aborted) {
      throw WorkflowError.cancelled(workflow.key);
    }

    const retryConfig = (step.config as { retry?: WorkflowStepRetryConfig }).retry;
    const maxAttempts = Math.max(1, retryConfig?.maxAttempts ?? 1);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const output = await handler(step, context);
        context.variables[`${step.id}:output`] = output;
        return {
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          status: 'completed',
          output,
          attempts: attempt,
          startedAt,
          completedAt: Date.now(),
        };
      } catch (error) {
        if (error instanceof WorkflowConfirmationRequired) {
          return {
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            status: 'waiting_confirmation',
            error: error.message,
            attempts: attempt,
            startedAt,
            completedAt: Date.now(),
          };
        }
        lastError = error;
        if (attempt < maxAttempts) {
          logger.warn('workflow.executor', `Step "${step.name}" failed (attempt ${attempt}/${maxAttempts}), retrying`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    return {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: 'failed',
      error: message,
      attempts: maxAttempts,
      startedAt,
      completedAt: Date.now(),
    };
  }

  /** The single loop-continuation both a fresh `execute()` and a `resume()` call feed into —
   *  starting step differs, everything else (step-count guard, pause detection, completion/
   *  failure recording) is identical. */
  async function runFrom(
    workflow: WorkflowDefinition,
    stepsById: Map<string, WorkflowStepDefinition>,
    context: WorkflowContext,
    executionId: string,
    startStepId: string,
  ): Promise<WorkflowExecutionState> {
    let currentStepId: string | null = startStepId;
    let stepCount = 0;

    try {
      while (currentStepId) {
        if (stepCount >= MAX_STEPS_PER_EXECUTION) {
          throw WorkflowError.executionFailed(workflow.key, `Exceeded maximum step count of ${MAX_STEPS_PER_EXECUTION}`);
        }
        stepCount += 1;

        const step = stepsById.get(currentStepId);
        if (!step) {
          throw WorkflowError.stepNotFound(workflow.key, currentStepId);
        }

        deps.stateManager.setCurrentStep(executionId, step.id);

        const result = await runStep(workflow, step, context);
        deps.stateManager.appendStepResult(executionId, result);

        if (result.status === 'waiting_confirmation') {
          deps.stateManager.setStatus(executionId, 'WAITING_CONFIRMATION');
          pausedExecutions.set(executionId, { workflow, stepsById, context });
          const pausedState = deps.stateManager.getExecution(executionId);
          // Persisted immediately (not just held in the in-memory `pausedExecutions` map) so a
          // paused execution survives a server restart — `resume()`'s rehydration path below
          // reconstructs from exactly this row when the in-memory closure is gone.
          deps.historyStore.record(pausedState);
          logger.info('workflow.executor', `Workflow paused for confirmation: ${workflow.key} (${executionId}) at step "${step.name}"`);
          return pausedState;
        }

        if (result.status === 'completed') {
          await deps.events.emitStepCompleted(executionId, result);
        } else {
          await deps.events.emitStepFailed(executionId, result);
        }

        currentStepId = resolveNextStep(step, result.status === 'completed');
      }

      deps.stateManager.complete(executionId);
      const finalState = deps.stateManager.getExecution(executionId);
      deps.historyStore.record(finalState);
      await deps.events.emitCompleted(finalState);

      logger.info('workflow.executor', `Workflow completed: ${workflow.key} (${executionId})`);
      return finalState;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.stateManager.fail(executionId, message);
      const finalState = deps.stateManager.getExecution(executionId);
      deps.historyStore.record(finalState);
      await deps.events.emitFailed(finalState);

      logger.error('workflow.executor', `Workflow failed: ${workflow.key}`, { error: message });
      return finalState;
    }
  }

  return {
    registerStepHandler(type: WorkflowStepType, handler: WorkflowStepHandler): void {
      stepHandlers.set(type, handler);
    },

    async execute(input: ExecuteWorkflowInput): Promise<WorkflowExecutionState> {
      const workflow = deps.registry.getByKey(input.workflowKey, input.organizationId);

      if (workflow.status !== 'ACTIVE' && workflow.status !== 'DRAFT') {
        throw WorkflowError.executionFailed(input.workflowKey, `Workflow status is ${workflow.status}`);
      }

      const stepsById = new Map(workflow.steps.map((s) => [s.id, s]));
      const execution = deps.stateManager.createExecution(
        workflow.id,
        workflow.key,
        input.organizationId,
        input.initialVariables ?? {},
      );

      deps.stateManager.setStatus(execution.executionId, 'RUNNING');
      await deps.events.emitStarted(deps.stateManager.getExecution(execution.executionId));
      logger.info('workflow.executor', `Workflow started: ${workflow.key} (${execution.executionId})`);

      const context: WorkflowContext = {
        ...input.context,
        variables: execution.variables,
      };

      return runFrom(workflow, stepsById, context, execution.executionId, workflow.startStepId);
    },

    async resume(executionId: string, confirm: boolean, freshContext: WorkflowContext): Promise<WorkflowExecutionState> {
      let paused = pausedExecutions.get(executionId);

      if (!paused) {
        // Rehydration path: the in-memory paused closure is gone (most likely a server restart,
        // or a different process instance than the one that paused it). Reconstruct everything
        // from persisted state — the `WorkflowExecution` row (real DB data, written the moment
        // this execution paused, not just on completion) and the `Workflow` definition (already
        // DB-hydrated by `ensureOrganizationReady`) — using `freshContext` (built by the caller,
        // e.g. `buildIntelligenceContext`) in place of the original in-process context object.
        let state: WorkflowExecutionState;
        try {
          state = deps.stateManager.getExecution(executionId);
        } catch {
          const remote = deps.historyStore.getByIdRemote
            ? await deps.historyStore.getByIdRemote(executionId)
            : deps.historyStore.getById(executionId);
          if (!remote) throw WorkflowError.executionNotFound(executionId);
          deps.stateManager.seed(remote);
          state = remote;
        }

        if (state.status !== 'WAITING_CONFIRMATION') {
          throw WorkflowError.executionFailed(executionId, `Execution is not waiting for confirmation (status: ${state.status}).`);
        }

        const workflow = deps.registry.getById(state.workflowId);
        const stepsById = new Map(workflow.steps.map((s) => [s.id, s]));
        const rebuiltContext: WorkflowContext = { ...freshContext, variables: state.variables };
        paused = { workflow, stepsById, context: rebuiltContext };
        logger.info('workflow.executor', `Rehydrated paused execution from persisted state: ${workflow.key} (${executionId})`);
      }

      pausedExecutions.delete(executionId);

      const { workflow, stepsById, context } = paused;
      const execution = deps.stateManager.getExecution(executionId);
      const step = execution.currentStepId ? stepsById.get(execution.currentStepId) : undefined;
      if (!step) {
        throw WorkflowError.stepNotFound(workflow.key, execution.currentStepId ?? '(none)');
      }

      if (!confirm) {
        const declined: WorkflowStepResult = {
          stepId: step.id,
          stepName: step.name,
          stepType: step.type,
          status: 'failed',
          error: 'User declined confirmation.',
          startedAt: Date.now(),
          completedAt: Date.now(),
        };
        deps.stateManager.appendStepResult(executionId, declined);
        await deps.events.emitStepFailed(executionId, declined);
        deps.stateManager.setStatus(executionId, 'RUNNING');

        const nextStepId = resolveNextStep(step, false);
        if (!nextStepId) {
          deps.stateManager.fail(executionId, 'User declined a required confirmation.');
          const finalState = deps.stateManager.getExecution(executionId);
          deps.historyStore.record(finalState);
          await deps.events.emitFailed(finalState);
          logger.info('workflow.executor', `Workflow declined and stopped: ${workflow.key} (${executionId})`);
          return finalState;
        }
        return runFrom(workflow, stepsById, context, executionId, nextStepId);
      }

      context.variables[confirmationVariableKey(step.id)] = true;
      deps.stateManager.setStatus(executionId, 'RUNNING');
      logger.info('workflow.executor', `Workflow resumed after confirmation: ${workflow.key} (${executionId})`);
      return runFrom(workflow, stepsById, context, executionId, step.id);
    },
  };
}
