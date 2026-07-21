import type { WorkflowExecutionStatus, WorkflowStepDefinition, WorkflowStepStatus, WorkflowStepType } from '@/lib/workflows';
import type { ContextItem } from '@/lib/context-engine/types';

/**
 * How the plan came to exist. A goal is now composed from registered Skills (`src/lib/skills/`)
 * discovered at plan time, not matched against a fixed template list — 'skill-composed' covers
 * every real, executable plan, however many skills it chains. 'general-question' and
 * 'unsupported' are the two structural non-plans: no skill matched (routed to conversation
 * instead) or the goal named a capability Knottix genuinely has no skill for. Neither the
 * heuristic matcher nor the AI-upgrade path in `planner.ts` can invent a plan outside these three
 * shapes — the AI upgrade only ever picks from the SAME real, currently-registered skill keys.
 */
export type GoalPlanKind = 'skill-composed' | 'general-question' | 'unsupported';

export interface GoalPlan {
  goal: string;
  kind: GoalPlanKind;
  /** Keys of the skills actually composed into `steps`, in execution order — empty for
   *  'general-question'/'unsupported'. This is what memory (`memory.ts`) tags outcomes by and
   *  what the Skills page's usage/success-rate stats are keyed on. */
  skillKeys: string[];
  templateName: string;
  reasoning: string;
  steps: WorkflowStepDefinition[];
  startStepId: string;
  /** True the moment ANY step in the graph is a confirmation-gated tool (git_commit, git_push,
   *  close_app, whatsapp_send_message, ...) — surfaced up front so the Live Execution Panel can
   *  tell the user before they start that the run will pause partway through. */
  requiresConfirmation: boolean;
  /** Set only for kind === 'unsupported' — the goal named a capability Knottix has no real skill
   *  for yet (image/logo generation, invoice generation, presentation generation, ...), or every
   *  matched skill was missing a required input it couldn't extract from the goal text. When set,
   *  `steps` is always empty and nothing is ever executed — never fabricated. */
  unsupportedReason: string | null;
  classifiedBy: 'heuristic' | 'ai';
}

/** A minimal, real hint that a step's actual output named a file path or URL — populated only
 *  when the raw output object genuinely has a `.path`/`.url`/commit-hash-shaped field (see
 *  `summarizeOutput()` in `engine.ts`). `src/lib/task-sessions/manager.ts` is the consumer that
 *  turns this into a full `Artifact` record; kept primitive here so `goal-engine` never has to
 *  depend on the Task Session module's types. */
export interface GoalStepArtifactHint {
  type: 'file' | 'screenshot' | 'commit' | 'url';
  value: string;
}

export interface GoalStepSummary {
  id: string;
  name: string;
  type: WorkflowStepType;
  status: WorkflowStepStatus;
  attempts: number;
  /** A short, human-readable projection of the step's real output — never the raw object, so the
   *  Live Execution Panel never has to know each tool/agent's output shape. */
  summary: string | null;
  error: string | null;
  artifact: GoalStepArtifactHint | null;
  startedAt: number;
  completedAt: number | null;
}

export type GoalExecutionStatus = WorkflowExecutionStatus | 'UNSUPPORTED';

export interface GoalExecutionSummary {
  executionId: string | null;
  goal: string;
  templateName: string;
  /** Keys of the skills composed into this execution's plan, in order — empty for
   *  general-question/unsupported plans. Lets a caller (Task Sessions) attribute a running step
   *  back to the real skill that's executing it without re-parsing step-id prefixes itself. */
  skillKeys: string[];
  status: GoalExecutionStatus;
  currentStepId: string | null;
  steps: GoalStepSummary[];
  totalSteps: number;
  demo: boolean;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  /** Set only when status === 'UNSUPPORTED' — the honest explanation shown instead of a task graph. */
  message: string | null;
  /** The real, ranked context (`src/lib/context-engine/`) collected before planning and folded
   *  into this execution's 'agent' steps — empty in Demo Mode (context collection needs a real
   *  database) and empty if no context was found. */
  contextUsed: ContextItem[];
}
