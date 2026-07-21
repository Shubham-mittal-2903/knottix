import type { SessionUser } from '@/types';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { logger } from '@/lib/logger';
import type { ContextCollectionResult } from './types';

const CONTEXT_PATTERN_TAG = 'context-pattern';

function resolveScope(user: SessionUser): { namespace: 'workspace' | 'organization'; scopeId: string } {
  return user.workspaceId
    ? { namespace: 'workspace', scopeId: user.workspaceId }
    : { namespace: 'organization', scopeId: user.organizationId };
}

/**
 * "Store: frequently useful context combinations, preferred repositories, preferred project
 * structures, frequently reused documents." Written once per goal/session outcome (called from
 * `goal-engine`/`task-sessions` after a real execution finishes, not on every collection) so the
 * signal reflects context that actually contributed to a real result, not just context that was
 * looked at. Reuses the same Memory Engine every other module's pattern-memory already writes to.
 */
export async function recordContextUsage(result: ContextCollectionResult, outcome: 'succeeded' | 'failed', user: SessionUser): Promise<void> {
  if (result.selected.length === 0) return;

  try {
    const { system, context } = await buildIntelligenceContext(user, 'context-engine');
    const scope = resolveScope(user);

    const bySource = new Map<string, string[]>();
    for (const item of result.selected) {
      const list = bySource.get(item.source) ?? [];
      list.push(item.title);
      bySource.set(item.source, list);
    }
    const combination = Array.from(bySource.entries()).map(([source, titles]) => `${source}: ${titles.join(', ')}`).join('\n');

    await system.memoryEngine.create(context.memory, {
      namespace: scope.namespace,
      scopeId: scope.scopeId,
      organizationId: user.organizationId,
      workspaceId: user.workspaceId ?? user.organizationId,
      title: `Context used for "${result.query}" (${outcome})`.slice(0, 120),
      content: `Query: ${result.query}\nOutcome: ${outcome}\nSources: ${Array.from(bySource.keys()).join(', ')}\n\n${combination}`,
      summary: `${result.selected.length} context item(s) from ${bySource.size} source(s)`,
      sourceType: 'AGENT',
      memoryType: 'CONTEXT',
      tags: [CONTEXT_PATTERN_TAG, ...Array.from(bySource.keys()), outcome],
      metadata: { module: 'context-engine' },
      createdBy: user.id,
    });
  } catch (error) {
    logger.warn('context-engine.memory', 'Failed to record context usage pattern (execution itself was unaffected)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
