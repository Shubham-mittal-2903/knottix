import type { IntelligencePlatform } from '@/lib/intelligence';
import type { SkillEngine, RegisterSkillInput, SkillPlanBuilder } from '@/lib/skills';
import { isSkillError } from '@/lib/skills';
import { isToolError } from '@/lib/tools';
import { extractAfterKeyword, extractQuoted, step } from '@/lib/skills/catalog/shared';
import { callMCPTool } from './manager';
import type { MCPServerInfo, MCPToolDescriptor } from './types';

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
}

/** Keyed by `server.id` (a real UUID), not `server.name` — the Tool Registry and Skill Registry
 *  are process-wide flat maps (the same architecture every other tool/skill already uses, e.g.
 *  `github_list_repositories` is one global tool name whose handler resolves the calling org's own
 *  connection at execution time), so two different organizations naming their server the same
 *  thing (e.g. both calling it "figma") must never collide into the same registered tool — that
 *  would silently execute org B's calls against org A's connection. The UUID guarantees global
 *  uniqueness; `serverName` is used only for the human-readable description/keywords. */
export function mcpToolName(serverId: string, toolName: string): string {
  return `mcp_${serverId.replace(/-/g, '').slice(0, 12)}_${sanitize(toolName)}`;
}

function requiredParams(tool: MCPToolDescriptor): string[] {
  const schema = tool.inputSchema as { required?: unknown };
  return Array.isArray(schema.required) ? (schema.required as string[]) : [];
}

/**
 * "External MCP tools should appear as first-class Skills" and "the Goal Engine should compose
 * plans using Local Skills and MCP Skills without knowing the difference" — implemented literally:
 * each MCP tool becomes a REAL Tool Engine tool (`handler` calls `callMCPTool()`, the exact same
 * `toolEngine.execute()` path every local tool already goes through) and, when its input schema is
 * simple enough to extract from free text, a real `Skill` wrapping that one tool — the identical
 * shape every catalog skill in `skills/catalog/*.ts` already has. A tool with more than one
 * required parameter is still registered as a real, callable Tool Engine tool (reachable via the
 * MCP page or a future direct-call surface) but is honestly NOT auto-composed into a Skill — there
 * is no safe generic way to extract multiple structured arguments from free goal text, and
 * inventing one would risk silently misrouting real arguments to an external system.
 */
function buildSkillForTool(server: MCPServerInfo['server'], registeredToolName: string, tool: MCPToolDescriptor): RegisterSkillInput | null {
  const required = requiredParams(tool);
  if (required.length > 1) return null;

  const skillKey = `mcp:${sanitize(server.name)}:${sanitize(tool.name)}`;
  const displayName = `${tool.name} (${server.name})`;
  const readableToolName = tool.name.replace(/_/g, ' ');

  const buildPlan: SkillPlanBuilder =
    required.length === 0
      ? () => ({ steps: [step('s1', tool.name, 'tool', { toolName: registeredToolName, params: {} })], startStepId: 's1' })
      : (goalText: string) => {
          const value = extractQuoted(goalText) ?? extractAfterKeyword(goalText, [readableToolName]);
          if (!value) return null;
          return { steps: [step('s1', tool.name, 'tool', { toolName: registeredToolName, params: { [required[0]]: value } })], startStepId: 's1' };
        };

  return {
    key: skillKey,
    name: displayName,
    description: tool.description ?? `MCP tool "${tool.name}" from the connected "${server.name}" server.`,
    category: 'mcp',
    requiredTools: [registeredToolName],
    requiredPermission: 'integrations:read',
    inputs: required.map((r) => ({ name: r, type: 'string', description: r, required: true })),
    outputs: `Whatever the "${server.name}" MCP server's "${tool.name}" tool returns — passed through, never parsed or reinterpreted.`,
    verificationMethod: 'The Tool Engine step fails honestly if the MCP server returns an error or the call times out; no separate verification.',
    keywords: [readableToolName, server.name.toLowerCase()],
    buildPlan,
    // Scopes this skill to the connecting organization within the (process-wide) `SkillEngine` —
    // without this it defaults to the registry's "global" bucket, which every organization's
    // planner reads from, the exact same cross-tenant leak `mcpToolName()`'s own doc comment
    // explains for the Tool Registry.
    organizationId: server.organizationId,
  };
}

/**
 * Registers every tool a just-connected MCP server reports — into the REAL Tool Engine (so any
 * 'tool'-type workflow step can call it, identically to a local Desktop Runtime tool) and, where
 * safely composable, into the org-scoped `SkillEngine` ONLY — deliberately NOT the shared, global,
 * database-free `getSkillIndex()` catalog every static local skill also lives in. MCP servers are
 * per-organization (DEC-010's multi-org architecture); the global index is a single process-wide
 * instance shared by every organization in this process, so writing an org's MCP-derived skill
 * into it would leak that organization's connected server/tool names into every OTHER
 * organization's goal planning. `goal-engine/planner.ts`'s `discoverBest()` is what actually
 * reunites the two catalogs per-request — it merges the shared static index with THIS organization's
 * own `skillEngine`, so "Local Skills and MCP Skills without knowing the difference" holds without
 * ever mixing tenants. Idempotent: reconnecting a server simply re-registers the same keys,
 * swallowed as duplicates rather than erroring.
 */
export function registerMCPToolsAndSkills(intelligence: IntelligencePlatform, skillEngine: SkillEngine, serverInfo: MCPServerInfo): void {
  const { server, tools } = serverInfo;

  for (const tool of tools) {
    const registeredToolName = mcpToolName(server.id, tool.name);

    try {
      intelligence.tools.register({
        name: registeredToolName,
        description: tool.description ?? `MCP tool "${tool.name}" from server "${server.name}"`,
        category: 'integration',
        permission: 'integrations:read',
        parameters: [],
        handler: async (input) => callMCPTool(server.id, tool.name, input, null),
      });
    } catch (error) {
      if (!(isToolError(error) && error.code === 'DUPLICATE_TOOL')) throw error;
    }

    const skillInput = buildSkillForTool(server, registeredToolName, tool);
    if (!skillInput) continue;

    try {
      skillEngine.register(skillInput);
    } catch (error) {
      if (!(isSkillError(error) && error.code === 'DUPLICATE_KEY')) throw error;
    }
  }
}
