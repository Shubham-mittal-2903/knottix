import type { SessionUser } from '@/types';
import type { GoalExecutionSummary } from '@/lib/goal-engine';
import { startGoal, resumeGoal, getGoalStatus, getSkillIndex } from '@/lib/goal-engine';
import {
  createTaskSession,
  findActiveTaskSessionByKeyword,
  findTaskSessionById,
  listActiveTaskSessions,
  listTaskSessionsForOrganization,
  requireTaskSession,
  updateTaskSession,
} from '@/lib/db/queries/task-session';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { recordSessionOutcome } from './memory';
import type { ContextItem } from '@/lib/context-engine/types';
import type { Artifact, TaskSession, TaskSessionProgress, TaskSessionStatus } from './types';

/** "completed, paused, blocked, or cancelled" — the mission's own end-state vocabulary, mapped
 *  directly from the real underlying Goal Execution status. UNSUPPORTED maps to BLOCKED (the
 *  objective can't proceed with Knottix's current skill set, distinct from an attempted-and-failed
 *  execution). Never inferred — always a direct function of a real `GoalExecutionSummary.status`. */
function mapGoalStatusToSessionStatus(status: GoalExecutionSummary['status']): TaskSessionStatus {
  switch (status) {
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    case 'WAITING_CONFIRMATION':
      return 'PAUSED';
    case 'UNSUPPORTED':
      return 'BLOCKED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'RUNNING';
  }
}

/** Only ever built from real step output (`GoalStepArtifactHint`, populated in
 *  `goal-engine/engine.ts` from the step's actual tool output) — never fabricated. */
function collectArtifacts(summary: GoalExecutionSummary): Artifact[] {
  return summary.steps
    .filter((s) => s.artifact !== null)
    .map((s) => ({
      type: s.artifact!.type,
      label: s.name,
      value: s.artifact!.value,
      producedAt: s.completedAt ?? Date.now(),
      sourceStepName: s.name,
    }));
}

function mergeArtifacts(existing: Artifact[], fresh: Artifact[]): Artifact[] {
  const seen = new Set(existing.map((a) => `${a.type}:${a.value}`));
  const merged = [...existing];
  for (const a of fresh) {
    const key = `${a.type}:${a.value}`;
    if (!seen.has(key)) {
      merged.push(a);
      seen.add(key);
    }
  }
  return merged;
}

const MAX_WORKING_CONTEXT = 20;

/** The session's Working Context — reuses whatever `startGoal`/`resumeGoal` already collected via
 *  the Context Engine for this round (`GoalExecutionSummary.contextUsed`) rather than calling
 *  `collectContext()` a second time, which would be duplicate work against the same real sources.
 *  "New artifacts should automatically become part of the session context" holds because the
 *  Context Engine's own `artifact` collector reads straight from `TaskSession.artifacts`, so the
 *  NEXT round's collection pass (`continueTaskSession`) naturally picks up whatever the previous
 *  round just produced. */
function mergeWorkingContext(existing: ContextItem[], fresh: ContextItem[]): ContextItem[] {
  const bySourceRef = new Map(existing.map((i) => [`${i.source}:${i.sourceRef}`, i]));
  for (const item of fresh) bySourceRef.set(`${item.source}:${item.sourceRef}`, item);
  return Array.from(bySourceRef.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, MAX_WORKING_CONTEXT);
}

async function syncSessionFromSummary(
  session: TaskSession,
  summary: GoalExecutionSummary,
  user: SessionUser,
  workflowExecutionIds: string[] = session.workflowExecutionIds,
): Promise<TaskSession> {
  const status = mapGoalStatusToSessionStatus(summary.status);
  const artifacts = mergeArtifacts(session.artifacts, collectArtifacts(summary));
  const workingContext = mergeWorkingContext(session.workingContext, summary.contextUsed);
  const retryCount = session.retryCount + summary.steps.reduce((sum, s) => sum + Math.max(0, s.attempts - 1), 0);
  const isTerminal = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';

  const updated = await updateTaskSession(session.id, {
    status,
    currentWorkflowExecutionId: summary.executionId ?? session.currentWorkflowExecutionId,
    workflowExecutionIds,
    skillKeys: summary.skillKeys.length > 0 ? summary.skillKeys : session.skillKeys,
    artifacts,
    workingContext,
    retryCount,
    lastError: summary.error ?? summary.message ?? null,
    completedAt: isTerminal ? new Date() : null,
  });

  if (isTerminal) {
    await recordSessionOutcome(updated, summary, user).catch((error) => {
      logger.warn('task-sessions.manager', 'Failed to record session outcome to memory', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return updated;
}

function buildProgress(session: TaskSession, summary: GoalExecutionSummary): TaskSessionProgress {
  const finished = summary.steps.filter((s) => s.completedAt !== null);
  const avgMs = finished.length > 0 ? finished.reduce((sum, s) => sum + (s.completedAt! - s.startedAt), 0) / finished.length : null;
  const remainingSteps = summary.totalSteps - summary.steps.length;
  const estimatedRemainingMs = avgMs !== null && remainingSteps > 0 ? Math.round(avgMs * remainingSteps) : null;

  const currentStep = summary.steps.find((s) => s.id === summary.currentStepId) ?? null;
  const stepIndex = currentStep ? Number(currentStep.id.match(/^sk(\d+)_/)?.[1] ?? -1) : -1;
  const skillKey = stepIndex >= 0 ? summary.skillKeys[stepIndex] : undefined;
  const currentSkillName = skillKey
    ? (() => {
        try {
          return getSkillIndex().get(skillKey).name;
        } catch {
          return skillKey;
        }
      })()
    : null;

  return {
    session,
    currentStepId: summary.currentStepId,
    steps: summary.steps,
    totalSteps: summary.totalSteps,
    currentSkillName,
    currentEmployeeKey: currentStep?.type === 'agent' ? currentStep.name : null,
    currentToolName: currentStep?.type === 'tool' ? currentStep.name : null,
    estimatedRemainingMs,
  };
}

/** Starts a new Task Session for one high-level objective — creates the persisted session row,
 *  then runs the FIRST round entirely through the existing Goal Execution Engine (`startGoal`,
 *  which itself discovers and composes Skills). No new planning or execution logic — the session
 *  is a durable wrapper around what `startGoal` already does. */
export async function startTaskSession(objective: string, user: SessionUser): Promise<TaskSessionProgress> {
  const session = await createTaskSession({
    organizationId: user.organizationId,
    workspaceId: user.workspaceId,
    createdBy: user.id,
    objective,
  });

  const summary = await startGoal(objective, user);
  const workflowExecutionIds = summary.executionId ? [summary.executionId] : [];
  const updated = await syncSessionFromSummary(session, summary, user, workflowExecutionIds);

  return buildProgress(updated, summary);
}

/** Resumes a session paused at a confirmation-gated step. Reuses `resumeGoal`, which itself now
 *  survives a server restart (rehydrating from persisted `WorkflowExecution` state — see
 *  `WorkflowExecutor.resume()`) — the session-level "crash recovery" requirement falls out of that
 *  lower-level fix rather than needing its own separate mechanism. */
export async function resumeTaskSession(sessionId: string, confirm: boolean, user: SessionUser): Promise<TaskSessionProgress> {
  const session = await requireTaskSession(sessionId);
  assertOwnership(session, user);

  if (!session.currentWorkflowExecutionId) {
    throw AppError.validation('This session has no execution to resume.');
  }
  if (session.status !== 'PAUSED') {
    throw AppError.validation(`This session is ${session.status.toLowerCase()}, not paused.`);
  }

  const summary = await resumeGoal(session.currentWorkflowExecutionId, confirm, user);
  const updated = await syncSessionFromSummary(session, summary, user);
  return buildProgress(updated, summary);
}

/**
 * "Continue my website" — the Command Center's session-control vocabulary. Behavior depends on
 * the session's real current state, never a guess:
 * - PAUSED → same as confirming the pending step (an alias for `resumeTaskSession`)
 * - RUNNING → nothing to do, just returns current progress
 * - COMPLETED/FAILED/BLOCKED → starts ANOTHER round toward the SAME objective via `startGoal`,
 *   appending the new execution to the session's history. This is the one place a session spans
 *   more than one Goal Execution — still zero new planning intelligence, just calling the same
 *   `startGoal()` again.
 */
export async function continueTaskSession(sessionId: string, user: SessionUser): Promise<TaskSessionProgress> {
  const session = await requireTaskSession(sessionId);
  assertOwnership(session, user);

  if (session.status === 'PAUSED') {
    return resumeTaskSession(sessionId, true, user);
  }
  if (session.status === 'RUNNING') {
    return getTaskSessionProgress(sessionId, user);
  }
  if (session.status === 'CANCELLED') {
    throw AppError.validation('This session was cancelled and cannot be continued.');
  }

  const summary = await startGoal(session.objective, user);
  const workflowExecutionIds = summary.executionId ? [...session.workflowExecutionIds, summary.executionId] : session.workflowExecutionIds;
  const updated = await syncSessionFromSummary(session, summary, user, workflowExecutionIds);
  return buildProgress(updated, summary);
}

/** Cancels a session. If it's currently paused on a confirmation, declines that step first (via
 *  the real `resumeGoal(..., confirm: false)` path) so no execution is left silently parked
 *  waiting for a confirmation that will never come. */
export async function cancelTaskSession(sessionId: string, user: SessionUser): Promise<TaskSession> {
  const session = await requireTaskSession(sessionId);
  assertOwnership(session, user);

  if (session.status === 'PAUSED' && session.currentWorkflowExecutionId) {
    await resumeGoal(session.currentWorkflowExecutionId, false, user).catch((error) => {
      logger.warn('task-sessions.manager', 'Failed to decline pending confirmation while cancelling session', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return updateTaskSession(sessionId, { status: 'CANCELLED', completedAt: new Date() });
}

export async function getTaskSessionProgress(sessionId: string, user: SessionUser): Promise<TaskSessionProgress> {
  const session = await requireTaskSession(sessionId);
  assertOwnership(session, user);

  if (!session.currentWorkflowExecutionId) {
    return { session, currentStepId: null, steps: [], totalSteps: 0, currentSkillName: null, currentEmployeeKey: null, currentToolName: null, estimatedRemainingMs: null };
  }

  const summary = await getGoalStatus(session.currentWorkflowExecutionId, user);
  return buildProgress(session, summary);
}

export async function listTaskSessions(user: SessionUser, status?: TaskSessionStatus): Promise<TaskSession[]> {
  return listTaskSessionsForOrganization(user.organizationId, status);
}

export async function listRunningTaskSessions(user: SessionUser): Promise<TaskSession[]> {
  return listActiveTaskSessions(user.organizationId);
}

/** Backs Command Center phrases like "Resume ACCD" — finds the most recently updated
 *  non-terminal session whose objective loosely contains the named keyword. */
export async function findTaskSessionByKeyword(keyword: string, user: SessionUser): Promise<TaskSession | null> {
  return findActiveTaskSessionByKeyword(user.organizationId, keyword);
}

function assertOwnership(session: TaskSession, user: SessionUser): void {
  if (session.organizationId !== user.organizationId) {
    throw AppError.forbidden('This task session belongs to a different organization.');
  }
}

export { findTaskSessionById };
