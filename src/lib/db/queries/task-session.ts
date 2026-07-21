import { db } from '@/lib/db/prisma';
import { AppError } from '@/lib/errors';
import type { Prisma } from '@/generated/prisma/client';
import type { Artifact, TaskSession, TaskSessionStatus } from '@/lib/task-sessions/types';
import type { ContextItem } from '@/lib/context-engine/types';

interface TaskSessionRow {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  createdBy: string;
  objective: string;
  status: TaskSessionStatus;
  currentWorkflowExecutionId: string | null;
  workflowExecutionIds: Prisma.JsonValue;
  skillKeys: Prisma.JsonValue;
  artifacts: Prisma.JsonValue;
  workingContext: Prisma.JsonValue;
  retryCount: number;
  lastError: string | null;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

function toDomain(row: TaskSessionRow): TaskSession {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    createdBy: row.createdBy,
    objective: row.objective,
    status: row.status,
    currentWorkflowExecutionId: row.currentWorkflowExecutionId,
    workflowExecutionIds: Array.isArray(row.workflowExecutionIds) ? (row.workflowExecutionIds as string[]) : [],
    skillKeys: Array.isArray(row.skillKeys) ? (row.skillKeys as string[]) : [],
    artifacts: Array.isArray(row.artifacts) ? (row.artifacts as unknown as Artifact[]) : [],
    workingContext: Array.isArray(row.workingContext) ? (row.workingContext as unknown as ContextItem[]) : [],
    retryCount: row.retryCount,
    lastError: row.lastError,
    startedAt: row.startedAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    completedAt: row.completedAt?.getTime() ?? null,
  };
}

export interface CreateTaskSessionInput {
  organizationId: string;
  workspaceId: string | null;
  createdBy: string;
  objective: string;
}

export async function createTaskSession(input: CreateTaskSessionInput): Promise<TaskSession> {
  const row = await db.taskSession.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      createdBy: input.createdBy,
      objective: input.objective,
      status: 'RUNNING',
      workflowExecutionIds: [],
      skillKeys: [],
      artifacts: [],
      workingContext: [],
    },
  });
  return toDomain(row);
}

export async function findTaskSessionById(id: string): Promise<TaskSession | null> {
  const row = await db.taskSession.findUnique({ where: { id } });
  return row ? toDomain(row) : null;
}

export async function requireTaskSession(id: string): Promise<TaskSession> {
  const session = await findTaskSessionById(id);
  if (!session) throw AppError.notFound('Task session', id);
  return session;
}

export async function listTaskSessionsForOrganization(organizationId: string, status?: TaskSessionStatus, limit = 50): Promise<TaskSession[]> {
  const rows = await db.taskSession.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return rows.map(toDomain);
}

export interface UpdateTaskSessionInput {
  status?: TaskSessionStatus;
  currentWorkflowExecutionId?: string | null;
  workflowExecutionIds?: string[];
  skillKeys?: string[];
  artifacts?: Artifact[];
  workingContext?: ContextItem[];
  retryCount?: number;
  lastError?: string | null;
  completedAt?: Date | null;
}

export async function updateTaskSession(id: string, input: UpdateTaskSessionInput): Promise<TaskSession> {
  const row = await db.taskSession.update({
    where: { id },
    data: {
      status: input.status,
      currentWorkflowExecutionId: input.currentWorkflowExecutionId,
      workflowExecutionIds: input.workflowExecutionIds as unknown as Prisma.InputJsonValue,
      skillKeys: input.skillKeys as unknown as Prisma.InputJsonValue,
      artifacts: input.artifacts as unknown as Prisma.InputJsonValue,
      workingContext: input.workingContext as unknown as Prisma.InputJsonValue,
      retryCount: input.retryCount,
      lastError: input.lastError,
      completedAt: input.completedAt,
    },
  });
  return toDomain(row);
}

/** Finds the most recent non-terminal (RUNNING/PAUSED/BLOCKED) session whose objective text
 *  loosely matches a name/keyword — backs Command Center phrases like "Resume ACCD" or "Continue
 *  my website" where the user names the session by a fragment, not its full original objective. */
export async function findActiveTaskSessionByKeyword(organizationId: string, keyword: string): Promise<TaskSession | null> {
  const rows = await db.taskSession.findMany({
    where: {
      organizationId,
      status: { in: ['RUNNING', 'PAUSED', 'BLOCKED'] },
      objective: { contains: keyword, mode: 'insensitive' },
    },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });
  return rows[0] ? toDomain(rows[0]) : null;
}

export async function listActiveTaskSessions(organizationId: string): Promise<TaskSession[]> {
  const rows = await db.taskSession.findMany({
    where: { organizationId, status: { in: ['RUNNING', 'PAUSED', 'BLOCKED'] } },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toDomain);
}
