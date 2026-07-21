import { CLAUDE_HAIKU_MODEL } from '@/lib/system/bootstrap';
import { isDemoMode } from '@/lib/demo';
import { logger } from '@/lib/logger';
import { AI_EMPLOYEES } from '@/config/ai-employees';
import type { NavItem, CommandAction } from '@/config/navigation';
import type { IntelligencePlatform } from '@/lib/intelligence';
import type { AIRuntime } from '@/lib/ai';
import { heuristicClassify } from './router';
import { COMMAND_CENTER_INTENT_PROMPT_KEY, parseClassification } from './prompt';
import type { CommandPlan } from './types';

/**
 * Classifies a command using the existing Prompt Engine + AI Runtime (mirroring the exact
 * `promptEngine.render()` → `aiRuntime.complete()` shape `agent-pipeline.ts` already uses, just
 * without the full Agent Execution Pipeline) whenever a real provider is configured — never in
 * Demo Mode, which must not make a real AI call. Falls back to the deterministic heuristic
 * classifier on any failure (no provider configured, network error, malformed response), so the
 * Command Center always works even with zero AI Employees connected.
 */
export async function classifyCommand(
  query: string,
  deps: { platform: IntelligencePlatform; aiRuntime: AIRuntime; organizationId: string; userId: string },
  navItems: NavItem[],
  staticCommands: CommandAction[],
): Promise<CommandPlan> {
  const fallback = heuristicClassify(query, navItems, staticCommands);

  if (isDemoMode()) return fallback;

  try {
    const rendered = deps.platform.prompts.render({
      key: COMMAND_CENTER_INTENT_PROMPT_KEY,
      variables: { query },
    });

    const response = await deps.aiRuntime.complete({
      model: CLAUDE_HAIKU_MODEL,
      messages: [
        { role: 'system', content: rendered.content },
        { role: 'user', content: query },
      ],
      temperature: 0,
      maxTokens: 60,
      organizationId: deps.organizationId,
      userId: deps.userId,
      module: 'command-center',
    });

    const parsed = parseClassification(response.content);
    if (!parsed) return fallback;

    // The AI only decides intent + employee; tool/navigation resolution stays deterministic
    // (same router the heuristic path uses) so tool names are never hallucinated.
    if (parsed.intent === 'navigation' && fallback.navigationHref) {
      return { ...fallback, intent: 'navigation', reasoning: parsed.reasoning, classifiedBy: 'ai' };
    }
    if ((parsed.intent === 'tool' || parsed.intent === 'workflow' || parsed.intent === 'search') && fallback.steps.length > 0) {
      return { ...fallback, intent: parsed.intent, reasoning: parsed.reasoning, classifiedBy: 'ai' };
    }
    if (parsed.intent === 'conversation' || parsed.intent === 'information') {
      const employee = AI_EMPLOYEES.find((e) => e.key === parsed.employeeKey);
      return {
        ...fallback,
        intent: parsed.intent,
        reasoning: parsed.reasoning,
        employeeKey: employee?.key ?? fallback.employeeKey,
        employeeName: employee?.name ?? fallback.employeeName,
        steps: [],
        classifiedBy: 'ai',
      };
    }

    // AI disagreed with what the router could actually resolve — trust the router, since it's
    // the thing that determines what can really execute.
    return fallback;
  } catch (error) {
    logger.warn('command-center.classify', 'AI classification failed, using heuristic fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
