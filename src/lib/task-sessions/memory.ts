import type { SessionUser } from '@/types';
import type { GoalExecutionSummary } from '@/lib/goal-engine';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { logger } from '@/lib/logger';
import type { TaskSession } from './types';

const SESSION_MEMORY_TAG = 'task-session';

function resolveScope(user: SessionUser): { namespace: 'workspace' | 'organization'; scopeId: string } {
  return user.workspaceId
    ? { namespace: 'workspace', scopeId: user.workspaceId }
    : { namespace: 'organization', scopeId: user.organizationId };
}

/**
 * "Store: successful sessions, average execution time, reusable execution patterns, frequently
 * failing steps, preferred AI employee combinations." Written as one real `memoryEngine.create()`
 * entry per finished (terminal-status) Task Session — the same Memory Engine every other module
 * already writes to, tagged so a future planning pass (or a human browsing Knowledge) can find
 * which objectives/skill combinations tend to succeed. Fire-and-forget-safe: a memory write
 * failure must never fail the session itself.
 */
export async function recordSessionOutcome(session: TaskSession, summary: GoalExecutionSummary, user: SessionUser): Promise<void> {
  try {
    const { system, context } = await buildIntelligenceContext(user, 'task-sessions');
    const scope = resolveScope(user);

    const durationMs = session.completedAt ? session.completedAt - session.startedAt : null;
    const outcome = session.status === 'COMPLETED' ? 'succeeded' : session.status === 'CANCELLED' ? 'cancelled' : 'failed';
    const failingSteps = summary.steps.filter((s) => s.status === 'failed').map((s) => `${s.name}: ${s.error ?? 'unknown error'}`);

    await system.memoryEngine.create(context.memory, {
      namespace: scope.namespace,
      scopeId: scope.scopeId,
      organizationId: user.organizationId,
      workspaceId: user.workspaceId ?? user.organizationId,
      title: `Task Session ${outcome}: ${session.objective}`.slice(0, 120),
      content: [
        `Objective: ${session.objective}`,
        `Outcome: ${outcome}`,
        `Rounds: ${session.workflowExecutionIds.length}`,
        `Skills used: ${session.skillKeys.join(', ') || 'none'}`,
        `Retries: ${session.retryCount}`,
        `Artifacts produced: ${session.artifacts.length}`,
        durationMs !== null ? `Duration: ${Math.round(durationMs / 1000)}s` : null,
        failingSteps.length > 0 ? `Failing steps:\n${failingSteps.map((f) => `- ${f}`).join('\n')}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      summary: `${outcome} in ${session.workflowExecutionIds.length} round(s), ${session.artifacts.length} artifact(s)`,
      sourceType: 'AGENT',
      memoryType: outcome === 'succeeded' ? 'INSIGHT' : 'CONTEXT',
      sourceId: session.id,
      tags: [SESSION_MEMORY_TAG, ...session.skillKeys, outcome],
      metadata: { module: 'task-sessions' },
      createdBy: user.id,
    });
  } catch (error) {
    logger.warn('task-sessions.memory', 'Failed to record session outcome to memory (session itself was unaffected)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * "Preferred AI employee combinations" / "average execution time" — queried on demand (the Task
 * Sessions page, or a future planning upgrade) rather than pre-aggregated, so it's always computed
 * from real, current memory entries rather than a separately-maintained rolling statistic that
 * could drift.
 */
export async function recallSessionPatterns(
  user: SessionUser,
  limit = 20,
): Promise<{ succeeded: number; failed: number; cancelled: number; avgDurationMs: number | null }> {
  try {
    const { system, context } = await buildIntelligenceContext(user, 'task-sessions');
    const scope = resolveScope(user);
    const page = await system.memoryEngine.query(context.memory, { namespace: scope.namespace, scopeId: scope.scopeId, tags: [SESSION_MEMORY_TAG] }, 1, limit);

    const succeeded = page.entries.filter((e) => e.tags.includes('succeeded')).length;
    const failed = page.entries.filter((e) => e.tags.includes('failed')).length;
    const cancelled = page.entries.filter((e) => e.tags.includes('cancelled')).length;

    const durations = page.entries
      .map((e) => e.content.match(/Duration: (\d+)s/)?.[1])
      .filter((v): v is string => Boolean(v))
      .map((v) => Number(v) * 1000);
    const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    return { succeeded, failed, cancelled, avgDurationMs };
  } catch (error) {
    logger.warn('task-sessions.memory', 'Failed to recall session patterns from memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { succeeded: 0, failed: 0, cancelled: 0, avgDurationMs: null };
  }
}
