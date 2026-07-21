import type { PromptContextBlock } from '@/lib/prompt';
import type { ToolDefinition, ToolEngine } from '@/lib/tools';
import type { MemoryEngine } from '@/lib/memory';
import type { ContextBuilder, IntelligenceContext } from '@/lib/intelligence';
import type { AgentContext, AgentDefinition } from '../types';
import { logger } from '@/lib/logger';

const CONVERSATION_MEMORY_LIMIT = 20;
const ORGANIZATION_MEMORY_LIMIT = 20;
const TOOL_RESULT_CHAR_LIMIT = 800;

export interface AgentContextBuilder {
  build(intelligenceContext: IntelligenceContext, agent: AgentDefinition): Promise<AgentContext>;
}

function isAutoInvokable(tool: ToolDefinition): boolean {
  return tool.parameters.every((param) => !param.required);
}

function stringifyToolOutput(output: unknown): string {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  return text.length > TOOL_RESULT_CHAR_LIMIT ? `${text.slice(0, TOOL_RESULT_CHAR_LIMIT)}…` : text;
}

export function createAgentContextBuilder(deps: {
  toolEngine: ToolEngine;
  memoryEngine: MemoryEngine;
  contextBuilder: ContextBuilder;
}): AgentContextBuilder {
  function resolveAllowedTools(agent: AgentDefinition): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const name of agent.allowedTools) {
      try {
        const tool = deps.toolEngine.get(name);
        if (tool.isActive) tools.push(tool);
      } catch {
        continue;
      }
    }
    return tools;
  }

  async function resolveMemoryContextBlocks(intelligenceContext: IntelligenceContext): Promise<PromptContextBlock[]> {
    const blocks: PromptContextBlock[] = [];

    const orgPage = await deps.memoryEngine.query(
      intelligenceContext.memory,
      { namespace: 'organization', scopeId: intelligenceContext.organization.id, status: 'active' },
      1,
      ORGANIZATION_MEMORY_LIMIT,
    );
    if (orgPage.entries.length > 0) {
      blocks.push({
        label: 'organization-memory',
        entries: orgPage.entries.map((entry) => ({
          sourceType: entry.sourceType,
          date: new Date(entry.createdAt).toISOString().slice(0, 10),
          content: entry.summary ?? entry.content,
        })),
      });
    }

    if (intelligenceContext.conversation) {
      const convoPage = await deps.memoryEngine.query(
        intelligenceContext.memory,
        { namespace: 'conversation', scopeId: intelligenceContext.conversation.id, status: 'active' },
        1,
        CONVERSATION_MEMORY_LIMIT,
      );
      if (convoPage.entries.length > 0) {
        blocks.push({
          label: 'conversation',
          entries: convoPage.entries.map((entry) => ({
            sourceType: entry.sourceType,
            date: new Date(entry.createdAt).toISOString().slice(0, 10),
            content: entry.summary ?? entry.content,
          })),
        });
      }
    }

    return blocks;
  }

  /**
   * "Tool Resolution" for the agent pipeline means auto-executing the agent's read-only,
   * zero-required-parameter tools and folding their output into prompt context — not a
   * multi-turn, model-driven function-calling loop (see IDEA-016). Parameterized tools are
   * still resolved as descriptors for future use but are not auto-invoked here.
   */
  async function resolveToolContextBlocks(
    intelligenceContext: IntelligenceContext,
    tools: ToolDefinition[],
  ): Promise<PromptContextBlock[]> {
    const toolAccessContext = deps.contextBuilder.toToolAccessContext(intelligenceContext);
    const toolExecutionContext = deps.contextBuilder.toToolExecutionContext(intelligenceContext);
    const today = new Date().toISOString().slice(0, 10);

    const results = await Promise.all(
      tools.filter(isAutoInvokable).map(async (tool) => {
        try {
          const result = await deps.toolEngine.execute(tool.name, {}, toolAccessContext, toolExecutionContext);
          if (!result.success) return null;
          return { tool, content: stringifyToolOutput(result.output) };
        } catch (error) {
          logger.warn('agent.context', `Auto-resolution failed for tool: ${tool.name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      }),
    );

    return results
      .filter((r): r is { tool: ToolDefinition; content: string } => r !== null)
      .map((r) => ({
        label: `tool:${r.tool.name}`,
        entries: [{ sourceType: 'SYSTEM', date: today, content: r.content }],
      }));
  }

  return {
    async build(intelligenceContext: IntelligenceContext, agent: AgentDefinition): Promise<AgentContext> {
      const tools = resolveAllowedTools(agent);

      const [memoryBlocks, toolBlocks] = await Promise.all([
        resolveMemoryContextBlocks(intelligenceContext),
        resolveToolContextBlocks(intelligenceContext, tools),
      ]);

      return {
        intelligence: intelligenceContext,
        agent,
        allowedTools: tools.map((tool) => deps.toolEngine.toDescriptor(tool)),
        contextBlocks: [...memoryBlocks, ...toolBlocks],
      };
    },
  };
}
