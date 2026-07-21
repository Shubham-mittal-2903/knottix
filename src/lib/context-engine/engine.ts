import type { SessionUser } from '@/types';
import { buildIntelligenceContext } from '@/lib/system/request-context';
import { logger } from '@/lib/logger';
import { ALL_COLLECTORS } from './collectors';
import { rankAndSelect } from './ranking';
import type { ContextCollectionResult, ContextItem, ContextSourceType } from './types';

/**
 * The first step of every Goal Execution, per the mission's own pipeline: `User Goal → Context
 * Collection → Context Ranking → Goal Planning → Execution`. Every collector (`collectors.ts`)
 * reads a real, already-existing data source in parallel; a failing collector is logged and
 * treated as empty rather than failing the whole pipeline (the same resilience discipline
 * `getGitHubSummary`/Mission Control's Knowledge Highlights already use) — collecting context must
 * never itself become a reason a goal can't start.
 */
export async function collectContext(query: string, user: SessionUser): Promise<ContextCollectionResult> {
  const now = Date.now();
  const { system, context } = await buildIntelligenceContext(user, 'context-engine');

  const results = await Promise.all(
    ALL_COLLECTORS.map(async (collector) => {
      try {
        const items = await collector.run(query, { system, context, user, now });
        return { source: collector.source, items };
      } catch (error) {
        logger.warn('context-engine.engine', `Collector "${collector.source}" failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return { source: collector.source, items: [] as ContextItem[] };
      }
    }),
  );

  const sourcesQueried: { source: ContextSourceType; itemCount: number }[] = results.map((r) => ({ source: r.source, itemCount: r.items.length }));
  const allItems = results.flatMap((r) => r.items);
  const { selected, rejected } = rankAndSelect(allItems);

  return { query, selected, rejected, sourcesQueried, collectedAt: now };
}

/** Renders a selected context bundle as plain text, suitable for prepending to an 'agent' step's
 *  input — real, sourced facts the agent can ground its response in, never a fabricated summary. */
export function renderContextBlock(items: ContextItem[]): string {
  if (items.length === 0) return '';
  const lines = items.map((i) => `- [${i.source}] ${i.title}: ${i.summary}`);
  return `Relevant context (from ${items.length} real source${items.length === 1 ? '' : 's'} already in Knottix):\n${lines.join('\n')}`;
}

/** Backs Command Center questions like "What do you know about ACCD?" / "Why did you choose this
 *  context?" — re-runs the exact same collection+ranking pipeline and formats a readable answer,
 *  so the explanation is always describing what would ACTUALLY be collected right now, not a
 *  cached or separately-maintained description of the system's behavior. */
export async function explainContext(query: string, user: SessionUser): Promise<string> {
  const result = await collectContext(query, user);

  if (result.selected.length === 0) {
    const checked = result.sourcesQueried.map((s) => s.source).join(', ');
    return `I don't have any relevant context for "${query}" yet. I checked: ${checked}.`;
  }

  const bySource = new Map<string, number>();
  for (const item of result.selected) bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1);
  const sourceSummary = Array.from(bySource.entries()).map(([s, n]) => `${n} from ${s}`).join(', ');

  const top = result.selected.slice(0, 5).map((i) => `- ${i.title} (${i.source}, score ${i.totalScore.toFixed(2)}) — ${i.reasonSelected}`);

  return `For "${query}" I'm using ${result.selected.length} item(s): ${sourceSummary}.\n\nTop items:\n${top.join('\n')}`;
}
