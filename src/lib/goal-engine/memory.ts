import type { MemoryEngine } from '@/lib/memory';
import type { IntelligenceContext } from '@/lib/intelligence';
import type { SessionUser } from '@/types';
import type { WorkflowExecutionState } from '@/lib/workflows';
import { logger } from '@/lib/logger';
import type { GoalPlan } from './types';

const GOAL_MEMORY_TAG = 'goal-execution';

function resolveScope(user: SessionUser): { namespace: 'workspace' | 'organization'; scopeId: string } {
  return user.workspaceId
    ? { namespace: 'workspace', scopeId: user.workspaceId }
    : { namespace: 'organization', scopeId: user.organizationId };
}

/**
 * Writes one Memory Engine entry per finished goal execution — "Remember successful workflows,
 * failed workflows, preferred tools" from the mission, implemented as real `memoryEngine.create()`
 * calls (the same engine every other module already writes to), tagged with every skill key the
 * plan composed plus the outcome, so `recallGoalHistory()` below can find them again keyed by
 * skill rather than by a now-removed fixed template concept. Fire-and-forget-safe: a memory write
 * failure must never fail the goal execution itself (mirrors DEC-021's audit-log discipline).
 */
export async function recordGoalOutcome(
  memoryEngine: MemoryEngine,
  context: IntelligenceContext,
  user: SessionUser,
  plan: GoalPlan,
  state: WorkflowExecutionState,
): Promise<void> {
  try {
    const scope = resolveScope(user);
    const outcome = state.status === 'COMPLETED' ? 'succeeded' : state.status === 'FAILED' ? 'failed' : state.status;
    const stepLines = state.stepResults
      .map((r) => `- [${r.status}] ${r.stepName}${r.error ? ` — ${r.error}` : ''}`)
      .join('\n');

    await memoryEngine.create(context.memory, {
      namespace: scope.namespace,
      scopeId: scope.scopeId,
      organizationId: user.organizationId,
      workspaceId: user.workspaceId ?? user.organizationId,
      title: `Goal ${outcome}: ${plan.goal}`.slice(0, 120),
      content: `Goal: ${plan.goal}\nSkills: ${plan.templateName} (${plan.skillKeys.join(', ') || 'none'})\nOutcome: ${outcome}\n\nSteps:\n${stepLines}`,
      summary: `${plan.templateName} — ${outcome}`,
      sourceType: 'AGENT',
      memoryType: outcome === 'succeeded' ? 'INSIGHT' : 'CONTEXT',
      sourceId: state.executionId,
      tags: [GOAL_MEMORY_TAG, ...plan.skillKeys, outcome],
      metadata: { module: 'goal-engine' },
      createdBy: user.id,
    });
  } catch (error) {
    logger.warn('goal-engine.memory', 'Failed to record goal outcome to memory (execution itself was unaffected)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * "Reuse successful workflows automatically" — queried by the planner before executing a fresh
 * plan so it can note in `GoalPlan.reasoning` whether the skills involved have a track record.
 * This is informational only (surfaced to the user, not silently changing execution) — the actual
 * workflow graph always comes from each skill's real, reviewable `buildPlan()` code, never
 * reconstructed from a stored memory entry, so a goal can never execute a plan nobody wrote.
 */
export async function recallGoalHistory(
  memoryEngine: MemoryEngine,
  context: IntelligenceContext,
  user: SessionUser,
  skillKeys: string[],
): Promise<{ succeeded: number; failed: number }> {
  if (skillKeys.length === 0) return { succeeded: 0, failed: 0 };

  try {
    const scope = resolveScope(user);
    // `MemoryFilter.tags` is `hasSome` (OR) — querying by GOAL_MEMORY_TAG alone and filtering the
    // (bounded) page client-side for an actual skillKey match avoids the false-positive OR match
    // that passing both tags in one array would produce (it would match ANY goal outcome, not
    // just ones involving these skills).
    const page = await memoryEngine.query(context.memory, {
      namespace: scope.namespace,
      scopeId: scope.scopeId,
      tags: [GOAL_MEMORY_TAG],
    }, 1, 50);

    const relevant = page.entries.filter((e) => skillKeys.some((key) => e.tags.includes(key)));
    const succeeded = relevant.filter((e) => e.tags.includes('succeeded')).length;
    const failed = relevant.filter((e) => e.tags.includes('failed')).length;
    return { succeeded, failed };
  } catch (error) {
    logger.warn('goal-engine.memory', 'Failed to recall goal history from memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { succeeded: 0, failed: 0 };
  }
}
