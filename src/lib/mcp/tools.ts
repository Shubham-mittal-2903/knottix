import type { IntelligencePlatform } from '@/lib/intelligence';
import { registerTools } from '@/lib/agents/employees/registration';
import { getMCPPrompt } from './manager';

/**
 * "Allow AI Employees to request MCP prompts when appropriate. Prompt usage must be logged." — a
 * single, generic Tool Engine tool (unlike per-server-per-tool `registerMCPToolsAndSkills()`,
 * prompts aren't auto-composed into Skills since a prompt is a request FOR a prompt template, not
 * an action with a fixed effect) so any AI Employee can request a named prompt from a specific
 * connected server. Every call routes through `manager.ts`'s `getMCPPrompt()`, which is already
 * wrapped in `loggedCall()` — the exact same `MCPCallLog` mechanism every tool/resource call uses,
 * so "prompt usage must be logged" holds with zero new logging logic. Registered once per
 * organization inside `ensureOrganizationReady()`, same as `registerDesktopRuntimeTools`.
 */
export function registerMCPCoreTools(intelligence: IntelligencePlatform): void {
  registerTools(intelligence, [
    {
      name: 'mcp_get_prompt',
      description: 'Request a named prompt template from a connected MCP server. Use "Show connected MCP servers" first to find a server id.',
      category: 'integration',
      permission: 'integrations:read',
      parameters: [
        { name: 'serverId', type: 'string', description: 'The connected MCP server id', required: true },
        { name: 'promptName', type: 'string', description: 'The name of the prompt to request', required: true },
        { name: 'args', type: 'object', description: 'Prompt arguments, as a flat object of strings', required: false },
      ],
      version: '1.0.0',
      handler: async (input, context) => {
        const serverId = String(input.serverId ?? '');
        const promptName = String(input.promptName ?? '');
        const args = (input.args ?? {}) as Record<string, string>;
        return getMCPPrompt(serverId, promptName, args, context.userId);
      },
    },
  ]);
}
