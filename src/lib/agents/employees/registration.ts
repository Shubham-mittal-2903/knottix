import type { IntelligencePlatform } from '@/lib/intelligence';
import type { RegisterToolInput } from '@/lib/tools';
import { isToolError } from '@/lib/tools';
import type { CreatePromptTemplateInput } from '@/lib/prompt';
import { isPromptError } from '@/lib/prompt';
import type { RegisterAgentInput } from '@/lib/agents';
import { isAgentError } from '@/lib/agents';
import { logger } from '@/lib/logger';

export interface AIEmployeeDefinition {
  tools?: RegisterToolInput[];
  prompt: CreatePromptTemplateInput;
  agent: Omit<RegisterAgentInput, 'organizationId'>;
}

export function registerTools(platform: IntelligencePlatform, tools: RegisterToolInput[]): void {
  for (const tool of tools) {
    try {
      platform.tools.register(tool);
    } catch (error) {
      if (!(isToolError(error) && error.code === 'DUPLICATE_TOOL')) throw error;
    }
  }
}

/**
 * Idempotent registration shared by every AI Employee: tools → prompt → agent, each
 * tolerating "already exists" so repeated calls (dev hot-reload, multiple requests before
 * the readiness cache is warm) are safe no-ops rather than errors.
 */
export function registerAIEmployee(
  platform: IntelligencePlatform,
  organizationId: string,
  definition: AIEmployeeDefinition,
): void {
  if (definition.tools) registerTools(platform, definition.tools);

  try {
    platform.prompts.createTemplate(definition.prompt);
  } catch (error) {
    if (!(isPromptError(error) && error.code === 'DUPLICATE_KEY')) throw error;
  }

  try {
    platform.agents.register({ ...definition.agent, organizationId });
  } catch (error) {
    if (!(isAgentError(error) && error.code === 'DUPLICATE_KEY')) throw error;
  }

  logger.info('agents.employees', `AI Employee ready: ${definition.agent.key} (org ${organizationId})`);
}
