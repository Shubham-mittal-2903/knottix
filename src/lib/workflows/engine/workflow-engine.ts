import type {
  CreateWorkflowInput,
  ExecuteWorkflowInput,
  UpdateWorkflowInput,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionState,
  WorkflowFilter,
  WorkflowStepHandler,
  WorkflowStepType,
} from '../types';
import type { WorkflowRegistry } from '../registry/workflow-registry';
import type { WorkflowStateManager } from '../state/workflow-state';
import type { WorkflowHistoryStore } from '../history/workflow-history';
import type { WorkflowExecutor } from '../execution/workflow-executor';
import { logger } from '@/lib/logger';

export interface WorkflowEngine {
  create(input: CreateWorkflowInput): WorkflowDefinition;
  update(workflowId: string, input: UpdateWorkflowInput): WorkflowDefinition;
  getById(workflowId: string): WorkflowDefinition;
  getByKey(key: string, organizationId?: string | null): WorkflowDefinition;
  find(filter: WorkflowFilter): WorkflowDefinition[];
  activate(workflowId: string): WorkflowDefinition;
  registerStepHandler(type: WorkflowStepType, handler: WorkflowStepHandler): void;
  execute(input: ExecuteWorkflowInput): Promise<WorkflowExecutionState>;
  resume(executionId: string, confirm: boolean, context: WorkflowContext): Promise<WorkflowExecutionState>;
  getExecution(executionId: string): WorkflowExecutionState;
  getHistory(workflowId: string, limit?: number): WorkflowExecutionState[];
}

export function createWorkflowEngine(deps: {
  registry: WorkflowRegistry;
  stateManager: WorkflowStateManager;
  historyStore: WorkflowHistoryStore;
  executor: WorkflowExecutor;
}): WorkflowEngine {
  return {
    create(input: CreateWorkflowInput): WorkflowDefinition {
      const workflow = deps.registry.create(input);
      logger.info('workflow.engine', `Workflow created: ${workflow.key}`);
      return workflow;
    },

    update(workflowId: string, input: UpdateWorkflowInput): WorkflowDefinition {
      const workflow = deps.registry.update(workflowId, input);
      logger.info('workflow.engine', `Workflow updated: ${workflow.key} (v${workflow.version})`);
      return workflow;
    },

    getById(workflowId: string): WorkflowDefinition {
      return deps.registry.getById(workflowId);
    },

    getByKey(key: string, organizationId?: string | null): WorkflowDefinition {
      return deps.registry.getByKey(key, organizationId);
    },

    find(filter: WorkflowFilter): WorkflowDefinition[] {
      return deps.registry.find(filter);
    },

    activate(workflowId: string): WorkflowDefinition {
      return deps.registry.update(workflowId, { status: 'ACTIVE' });
    },

    registerStepHandler(type: WorkflowStepType, handler: WorkflowStepHandler): void {
      deps.executor.registerStepHandler(type, handler);
    },

    async execute(input: ExecuteWorkflowInput): Promise<WorkflowExecutionState> {
      return deps.executor.execute(input);
    },

    async resume(executionId: string, confirm: boolean, context: WorkflowContext): Promise<WorkflowExecutionState> {
      return deps.executor.resume(executionId, confirm, context);
    },

    getExecution(executionId: string): WorkflowExecutionState {
      return deps.stateManager.getExecution(executionId);
    },

    getHistory(workflowId: string, limit?: number): WorkflowExecutionState[] {
      return deps.historyStore.listByWorkflow(workflowId, limit);
    },
  };
}
