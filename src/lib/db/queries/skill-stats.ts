import { db } from '@/lib/db/prisma';
import type { SkillStats } from '@/lib/skills';

interface StepResultRow {
  stepId: string;
  status: string;
  error?: string;
  attempts?: number;
}

const BOUND = 300;

/**
 * Real self-evaluation stats, derived entirely from already-persisted `WorkflowExecution` rows —
 * no new stats table. Every goal execution stashes `__skillKeys` (the ordered list of skills its
 * plan composed) into `WorkflowContext.variables` at start time (`goal-engine/engine.ts`), which
 * `workflow-persistence.ts` already writes verbatim to `WorkflowExecution.input` for every
 * execution, with no change needed there. Bounded to the most recent 300 executions per
 * organization — an internal-tool-scale tradeoff, not a hard limit; revisit if execution volume
 * grows (see the corresponding idea entry).
 */
export async function getSkillStats(skillKey: string, organizationId: string): Promise<SkillStats> {
  const rows = await db.workflowExecution.findMany({
    where: { workflow: { organizationId } },
    orderBy: { createdAt: 'desc' },
    take: BOUND,
    select: { status: true, input: true, output: true, durationMs: true, startedAt: true, createdAt: true },
  });

  const attributed = rows.filter((row) => {
    const skillKeys = (row.input as { __skillKeys?: string[] } | null)?.__skillKeys;
    return Array.isArray(skillKeys) && skillKeys.includes(skillKey);
  });

  const usageCount = attributed.length;
  if (usageCount === 0) {
    return { usageCount: 0, successCount: 0, failureCount: 0, successRate: null, avgDurationMs: null, avgRetries: null, lastExecutedAt: null, commonFailures: [] };
  }

  const successCount = attributed.filter((r) => r.status === 'COMPLETED').length;
  const failureCount = attributed.filter((r) => r.status === 'FAILED').length;

  const durations = attributed.map((r) => r.durationMs).filter((d): d is number => typeof d === 'number');
  const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const failureTally = new Map<string, number>();
  let totalRetries = 0;
  let retryableSteps = 0;

  for (const row of attributed) {
    const stepResults = ((row.output as { stepResults?: StepResultRow[] } | null)?.stepResults ?? []) as StepResultRow[];
    for (const step of stepResults) {
      const attempts = step.attempts ?? 1;
      if (attempts > 1) {
        totalRetries += attempts - 1;
        retryableSteps += 1;
      }
      if (step.status === 'failed' && step.error) {
        failureTally.set(step.error, (failureTally.get(step.error) ?? 0) + 1);
      }
    }
  }

  const commonFailures = Array.from(failureTally.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const lastExecutedAt = attributed.reduce<number | null>((latest, r) => {
    const t = (r.startedAt ?? r.createdAt).getTime();
    return latest === null || t > latest ? t : latest;
  }, null);

  return {
    usageCount,
    successCount,
    failureCount,
    successRate: Math.round((successCount / usageCount) * 100) / 100,
    avgDurationMs,
    avgRetries: retryableSteps > 0 ? Math.round((totalRetries / usageCount) * 100) / 100 : 0,
    lastExecutedAt,
    commonFailures,
  };
}
