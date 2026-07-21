import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { WorkflowRegistry } from '../registry/workflow-registry';
import type { WorkflowHistoryStore } from '../history/workflow-history';
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowDefinition,
  WorkflowExecutionState,
  WorkflowStepDefinition,
} from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedWorkflowRegistry extends WorkflowRegistry {
  hydrate(organizationId: string): Promise<number>;
}

interface WorkflowDefinitionJson {
  steps: WorkflowStepDefinition[];
  startStepId: string;
}

/**
 * `WorkflowDefinition.organizationId` may be null (global workflow) in the in-memory model,
 * but the `Workflow` table requires an organization. Global workflows are kept in-memory only.
 */
export function createPersistedWorkflowRegistry(base: WorkflowRegistry, db: PrismaClient): PersistedWorkflowRegistry {
  function persist(workflow: WorkflowDefinition): void {
    if (!workflow.organizationId) {
      logger.warn('workflow.persistence', `Skipping persistence for global workflow (no organizationId): ${workflow.key}`);
      return;
    }

    const organizationId = workflow.organizationId;
    const definition: WorkflowDefinitionJson = { steps: workflow.steps, startStepId: workflow.startStepId };

    fireAndForget(`workflow:${workflow.key}`, async () => {
      const shared = {
        name: workflow.name,
        description: workflow.description,
        definition: definition as unknown as Prisma.InputJsonValue,
        status: workflow.status,
        version: workflow.version,
        updatedBy: workflow.createdBy,
      };

      await db.workflow.upsert({
        where: { organizationId_slug: { organizationId, slug: workflow.key } },
        create: { organizationId, slug: workflow.key, createdBy: workflow.createdBy, ...shared },
        update: shared,
      });
    });
  }

  return {
    ...base,

    create(input: CreateWorkflowInput): WorkflowDefinition {
      const workflow = base.create(input);
      persist(workflow);
      return workflow;
    },

    update(workflowId: string, input: UpdateWorkflowInput): WorkflowDefinition {
      const workflow = base.update(workflowId, input);
      persist(workflow);
      return workflow;
    },

    async hydrate(organizationId: string): Promise<number> {
      const rows = await db.workflow.findMany({ where: { organizationId, deletedAt: null } });

      for (const row of rows) {
        if (base.exists(row.slug, organizationId)) continue;

        const definition = row.definition as unknown as WorkflowDefinitionJson;

        const workflow: WorkflowDefinition = {
          id: row.id,
          key: row.slug,
          name: row.name,
          description: row.description ?? '',
          steps: definition.steps,
          startStepId: definition.startStepId,
          organizationId: row.organizationId,
          status: row.status,
          version: row.version,
          createdBy: row.createdBy,
          createdAt: row.createdAt.getTime(),
          updatedAt: row.updatedAt.getTime(),
        };

        base.seed(workflow);
      }

      logger.info('workflow.persistence', `Hydrated ${rows.length} workflow definitions from database`);
      return rows.length;
    },
  };
}

export interface PersistedWorkflowHistoryStore extends WorkflowHistoryStore {
  hydrate(organizationId: string, limit?: number): Promise<number>;
}

/** Shared between `hydrate()` (bulk) and `getByIdRemote()` (single-row) so the DB-row → domain
 *  mapping is written once. */
function rowToExecutionState(
  row: {
    id: string;
    workflowId: string;
    status: WorkflowExecutionState['status'];
    input: unknown;
    output: unknown;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    metadata: unknown;
  },
  fallbackOrganizationId: string,
): WorkflowExecutionState {
  const metadata = (row.metadata as { workflowKey?: string; organizationId?: string; currentStepId?: string | null } | null) ?? {};
  const output = (row.output as { stepResults?: WorkflowExecutionState['stepResults'] } | null) ?? {};

  return {
    executionId: row.id,
    workflowId: row.workflowId,
    workflowKey: metadata.workflowKey ?? '',
    organizationId: metadata.organizationId ?? fallbackOrganizationId,
    status: row.status,
    currentStepId: metadata.currentStepId ?? null,
    stepResults: output.stepResults ?? [],
    variables: (row.input as Record<string, unknown> | null) ?? {},
    startedAt: row.startedAt?.getTime() ?? row.createdAt.getTime(),
    completedAt: row.completedAt?.getTime() ?? null,
    error: row.error,
  };
}

export function createPersistedWorkflowHistoryStore(
  base: WorkflowHistoryStore,
  db: PrismaClient,
): PersistedWorkflowHistoryStore {
  return {
    ...base,

    record(execution: WorkflowExecutionState): void {
      base.record(execution);

      fireAndForget(`workflow-execution:${execution.executionId}`, async () => {
        const durationMs = execution.completedAt ? execution.completedAt - execution.startedAt : null;
        const metadata = {
          workflowKey: execution.workflowKey,
          organizationId: execution.organizationId,
          currentStepId: execution.currentStepId,
        } as unknown as Prisma.InputJsonValue;

        await db.workflowExecution.upsert({
          where: { id: execution.executionId },
          create: {
            id: execution.executionId,
            workflowId: execution.workflowId,
            status: execution.status,
            input: execution.variables as unknown as Prisma.InputJsonValue,
            output: { stepResults: execution.stepResults } as unknown as Prisma.InputJsonValue,
            error: execution.error,
            startedAt: new Date(execution.startedAt),
            completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
            durationMs,
            metadata,
          },
          update: {
            status: execution.status,
            output: { stepResults: execution.stepResults } as unknown as Prisma.InputJsonValue,
            error: execution.error,
            completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
            durationMs,
            metadata,
          },
        });
      });
    },

    async getByIdRemote(executionId: string): Promise<WorkflowExecutionState | null> {
      const row = await db.workflowExecution.findUnique({ where: { id: executionId } });
      if (!row) return null;
      const metadata = (row.metadata as { organizationId?: string } | null) ?? {};
      return rowToExecutionState(row, metadata.organizationId ?? '');
    },

    async hydrate(organizationId: string, limit = 100): Promise<number> {
      const rows = await db.workflowExecution.findMany({
        where: { workflow: { organizationId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const row of rows) {
        base.record(rowToExecutionState(row, organizationId));
      }

      logger.info('workflow.persistence', `Hydrated ${rows.length} workflow executions from database`);
      return rows.length;
    },
  };
}
