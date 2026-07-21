import type { ContextItem, ContextSourceType } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Static per-source trust weights — a simple, inspectable heuristic (not a learned model): a
 *  human-authored Memory/Knowledge entry or a real GitHub repository is trusted more than
 *  ephemeral browser/desktop state, which can change moment to moment and isn't curated at all. */
const TRUST_WEIGHT: Record<ContextSourceType, number> = {
  knowledge: 1.0,
  memory: 0.95,
  document: 0.9,
  project: 0.9,
  github: 0.9,
  task: 0.85,
  meeting: 0.85,
  'task-session': 0.8,
  'workflow-history': 0.75,
  'skill-history': 0.75,
  artifact: 0.7,
  browser: 0.5,
  desktop: 0.5,
  // A server the founder explicitly configured and authenticated to — trusted similarly to GitHub,
  // but slightly below it since Knottix has no visibility into how the external server itself
  // sources or curates the resource content it returns.
  'mcp-resource': 0.85,
};

/** Keyword-overlap scoring, the same discipline `SkillDiscovery.discover()` already uses for
 *  skills — every term in the query that appears in the item's title/summary contributes,
 *  normalized by query length so a longer query isn't unfairly easy to score against. Title
 *  matches count double: a project literally named "ACCD" is more relevant to "Continue ACCD"
 *  than a document that merely mentions it in passing. */
export function scoreRelevance(query: string, title: string, summary: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\w-]/g, ''))
    .filter((t) => t.length > 2);
  if (terms.length === 0) return 0;

  const titleLower = title.toLowerCase();
  const summaryLower = summary.toLowerCase();

  let hits = 0;
  for (const term of terms) {
    if (titleLower.includes(term)) hits += 2;
    else if (summaryLower.includes(term)) hits += 1;
  }

  return Math.min(1, hits / (terms.length * 2));
}

/** Exponential recency decay, half-life 14 days — an item from today scores ~1.0, one from two
 *  weeks ago ~0.5, one from two months ago ~0.06. Items with no real timestamp get a neutral 0.5
 *  rather than being penalized for a property their source doesn't have. */
export function scoreFreshness(itemTimestamp: number | null, now: number): number {
  if (itemTimestamp === null) return 0.5;
  const ageMs = Math.max(0, now - itemTimestamp);
  const halfLifeMs = 14 * DAY_MS;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

export function scoreTrust(source: ContextSourceType): number {
  return TRUST_WEIGHT[source];
}

export function computeTotalScore(relevance: number, freshness: number, trust: number): number {
  return relevance * 0.5 + freshness * 0.3 + trust * 0.2;
}

const SELECTION_LIMIT = 15;
const RELEVANCE_FLOOR = 0.08;

/** Splits a scored, already-sorted-by-nothing list of items into `selected` (real signal, within
 *  the limit) and `rejected` (either below the relevance floor, or would have been selected but
 *  the bundle is already full) — every rejected item keeps a real reason, never silently dropped. */
export function rankAndSelect(items: ContextItem[]): { selected: ContextItem[]; rejected: ContextItem[] } {
  const sorted = [...items].sort((a, b) => b.totalScore - a.totalScore);

  const selected: ContextItem[] = [];
  const rejected: ContextItem[] = [];

  for (const item of sorted) {
    if (item.relevanceScore < RELEVANCE_FLOOR) {
      rejected.push({ ...item, reasonSelected: `Rejected — below relevance floor (${item.relevanceScore.toFixed(2)} < ${RELEVANCE_FLOOR}).` });
      continue;
    }
    if (selected.length >= SELECTION_LIMIT) {
      rejected.push({ ...item, reasonSelected: `Rejected — context bundle already full (top ${SELECTION_LIMIT} by score).` });
      continue;
    }
    selected.push(item);
  }

  return { selected, rejected };
}
