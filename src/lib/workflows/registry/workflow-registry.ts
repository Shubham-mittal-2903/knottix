import type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowDefinition, WorkflowFilter, WorkflowStepDefinition } from '../types';
import { WorkflowError } from '../errors';

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `wf_${Date.now()}_${idCounter}`;
}

function validateStepGraph(steps: WorkflowStepDefinition[], startStepId: string): void {
  if (steps.length === 0) {
    throw WorkflowError.invalidDefinition('Workflow must have at least one step');
  }

  const ids = new Set(steps.map((s) => s.id));
  if (!ids.has(startStepId)) {
    throw WorkflowError.invalidDefinition(`startStepId "${startStepId}" does not match any step`);
  }

  for (const step of steps) {
    if (step.onSuccess && !ids.has(step.onSuccess)) {
      throw WorkflowError.invalidDefinition(`Step "${step.id}" references unknown onSuccess step: ${step.onSuccess}`);
    }
    if (step.onFailure && !ids.has(step.onFailure)) {
      throw WorkflowError.invalidDefinition(`Step "${step.id}" references unknown onFailure step: ${step.onFailure}`);
    }
  }
}

export interface WorkflowRegistry {
  create(input: CreateWorkflowInput): WorkflowDefinition;
  update(workflowId: string, input: UpdateWorkflowInput): WorkflowDefinition;
  getById(workflowId: string): WorkflowDefinition;
  getByKey(key: string, organizationId?: string | null): WorkflowDefinition;
  find(filter: WorkflowFilter): WorkflowDefinition[];
  exists(key: string, organizationId?: string | null): boolean;
  seed(workflow: WorkflowDefinition): void;
}

export function createWorkflowRegistry(): WorkflowRegistry {
  const workflowsById = new Map<string, WorkflowDefinition>();
  const workflowsByKey = new Map<string, string>();

  function scopedKey(key: string, organizationId?: string | null): string {
    return `${organizationId ?? 'global'}::${key}`;
  }

  return {
    create(input: CreateWorkflowInput): WorkflowDefinition {
      const sk = scopedKey(input.key, input.organizationId ?? null);
      if (workflowsByKey.has(sk)) {
        throw WorkflowError.duplicateKey(input.key);
      }

      validateStepGraph(input.steps, input.startStepId);

      const now = Date.now();
      const workflow: WorkflowDefinition = {
        id: generateId(),
        key: input.key,
        name: input.name,
        description: input.description,
        steps: input.steps,
        startStepId: input.startStepId,
        organizationId: input.organizationId ?? null,
        status: 'DRAFT',
        version: 1,
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      };

      workflowsById.set(workflow.id, workflow);
      workflowsByKey.set(sk, workflow.id);

      return { ...workflow };
    },

    update(workflowId: string, input: UpdateWorkflowInput): WorkflowDefinition {
      const workflow = workflowsById.get(workflowId);
      if (!workflow) throw WorkflowError.workflowNotFound(workflowId);

      const nextSteps = input.steps ?? workflow.steps;
      const nextStartStepId = input.startStepId ?? workflow.startStepId;
      if (input.steps !== undefined || input.startStepId !== undefined) {
        validateStepGraph(nextSteps, nextStartStepId);
      }

      if (input.name !== undefined) workflow.name = input.name;
      if (input.description !== undefined) workflow.description = input.description;
      if (input.steps !== undefined) workflow.steps = input.steps;
      if (input.startStepId !== undefined) workflow.startStepId = input.startStepId;
      if (input.status !== undefined) workflow.status = input.status;

      workflow.version += 1;
      workflow.updatedAt = Date.now();

      return { ...workflow };
    },

    getById(workflowId: string): WorkflowDefinition {
      const workflow = workflowsById.get(workflowId);
      if (!workflow) throw WorkflowError.workflowNotFound(workflowId);
      return { ...workflow };
    },

    getByKey(key: string, organizationId?: string | null): WorkflowDefinition {
      const sk = scopedKey(key, organizationId ?? null);
      let id = workflowsByKey.get(sk);

      if (!id && organizationId) {
        id = workflowsByKey.get(scopedKey(key, null));
      }

      if (!id) throw WorkflowError.workflowNotFound(key);

      const workflow = workflowsById.get(id);
      if (!workflow) throw WorkflowError.workflowNotFound(key);

      return { ...workflow };
    },

    find(filter: WorkflowFilter): WorkflowDefinition[] {
      return Array.from(workflowsById.values())
        .filter((w) => {
          if (filter.organizationId !== undefined && w.organizationId !== filter.organizationId) return false;
          if (filter.status && w.status !== filter.status) return false;
          if (filter.search) {
            const lower = filter.search.toLowerCase();
            if (!w.name.toLowerCase().includes(lower) && !w.key.toLowerCase().includes(lower)) return false;
          }
          return true;
        })
        .map((w) => ({ ...w }));
    },

    exists(key: string, organizationId?: string | null): boolean {
      return workflowsByKey.has(scopedKey(key, organizationId ?? null));
    },

    seed(workflow: WorkflowDefinition): void {
      workflowsById.set(workflow.id, { ...workflow });
      workflowsByKey.set(scopedKey(workflow.key, workflow.organizationId), workflow.id);
    },
  };
}
