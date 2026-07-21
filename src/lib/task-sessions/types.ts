import type { GoalStepSummary } from '@/lib/goal-engine';
// Direct path, not the `@/lib/context-engine` barrel — that barrel's `engine.ts` transitively
// imports this file's own module (via `collectors.ts` → `db/queries/task-session.ts` →
// `task-sessions/types.ts`), so importing the barrel here would create a cycle. `types.ts` itself
// has zero runtime dependencies, so this path is always safe.
import type { ContextItem } from '@/lib/context-engine/types';

export type TaskSessionStatus = 'RUNNING' | 'PAUSED' | 'BLOCKED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ArtifactType = 'file' | 'screenshot' | 'commit' | 'url' | 'report';

/** Only ever created from a real step output — see `extractArtifacts()` in `manager.ts`. Never
 *  fabricated: a session with no real file/URL/commit output produces zero artifacts, honestly. */
export interface Artifact {
  type: ArtifactType;
  label: string;
  /** A file path, URL, or commit hash — whatever the underlying tool actually returned. */
  value: string;
  producedAt: number;
  /** Which skill/step produced it, for the timeline view. */
  sourceStepName: string;
}

export interface TaskSession {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  createdBy: string;
  objective: string;
  status: TaskSessionStatus;
  currentWorkflowExecutionId: string | null;
  workflowExecutionIds: string[];
  skillKeys: string[];
  artifacts: Artifact[];
  /** The session's real Working Context — see `src/lib/context-engine/`. Re-collected every round. */
  workingContext: ContextItem[];
  retryCount: number;
  lastError: string | null;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

/** A `TaskSession` row combined with a live projection of its current round's task graph — the
 *  DB row is the durable source of truth, the step-level detail is always fetched fresh from the
 *  real underlying Goal/Workflow execution, never cached or fabricated. */
export interface TaskSessionProgress {
  session: TaskSession;
  currentStepId: string | null;
  steps: GoalStepSummary[];
  totalSteps: number;
  currentSkillName: string | null;
  /** Populated only while a step is an 'agent' step targeting a real AI Employee. */
  currentEmployeeKey: string | null;
  currentToolName: string | null;
  /** Rough estimate from completed steps' average real duration × remaining step count — same
   *  honest-estimate discipline as the Goal Execution Panel's own remaining-time display. */
  estimatedRemainingMs: number | null;
}
