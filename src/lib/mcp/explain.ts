import type { MemoryEngine } from '@/lib/memory';
import type { IntelligenceContext } from '@/lib/intelligence';
import type { SessionUser } from '@/types';

const GOAL_MEMORY_TAG = 'goal-execution';

function resolveScope(user: SessionUser): { namespace: 'workspace' | 'organization'; scopeId: string } {
  return user.workspaceId
    ? { namespace: 'workspace', scopeId: user.workspaceId }
    : { namespace: 'organization', scopeId: user.organizationId };
}

/**
 * "Why did you choose this MCP tool?" — answered from the real Memory Engine record
 * `goal-engine/memory.ts`'s `recordGoalOutcome()` already writes for every finished goal execution
 * (tagged with every skill key involved, including `mcp:*` ones). No separate "reasoning log" is
 * invented for MCP specifically — this reads the same entries the Goal Engine itself relies on for
 * `recallGoalHistory()`, just filtered to the most recent one that used an MCP-derived skill.
 * Honest empty state when no goal has used an MCP tool yet, never fabricated.
 */
export async function explainRecentMCPToolChoice(memoryEngine: MemoryEngine, context: IntelligenceContext, user: SessionUser): Promise<string> {
  const scope = resolveScope(user);
  const page = await memoryEngine.query(context.memory, { namespace: scope.namespace, scopeId: scope.scopeId, tags: [GOAL_MEMORY_TAG] }, 1, 50);
  const mcpEntry = page.entries.find((e) => e.tags.some((t) => t.startsWith('mcp:')));
  if (!mcpEntry) return 'No goal has used an MCP tool yet — connect an MCP server and run a goal that uses it, then ask again.';
  return mcpEntry.content;
}
