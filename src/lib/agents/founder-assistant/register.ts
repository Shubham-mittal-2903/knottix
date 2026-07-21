import type { IntelligencePlatform } from '@/lib/intelligence';
import type { MemoryEngine } from '@/lib/memory';
import { registerAIEmployee, type AIEmployeeDefinition } from '@/lib/agents/employees/registration';
import { createFounderAssistantTools } from './tools';
import { FOUNDER_ASSISTANT_PROMPT, FOUNDER_ASSISTANT_PROMPT_KEY } from './prompt';

export const FOUNDER_ASSISTANT_KEY = 'founder-executive-assistant';

export function founderAssistantDefinition(memoryEngine: MemoryEngine): AIEmployeeDefinition {
  return {
    tools: createFounderAssistantTools({ memoryEngine }),
    prompt: FOUNDER_ASSISTANT_PROMPT,
    agent: {
      key: FOUNDER_ASSISTANT_KEY,
      name: 'Founder Executive Assistant',
      description:
        "Reads organizational memory, projects, tasks, and meetings to answer the Founder's questions and generate executive summaries.",
      capabilities: ['text-generation', 'tool-use', 'memory-access'],
      permission: 'agents:execute',
      promptKey: FOUNDER_ASSISTANT_PROMPT_KEY,
      allowedTools: ['read_organization_memory', 'list_projects', 'list_tasks', 'list_meetings'],
      maxTokens: 2048,
      temperature: 0.4,
    },
  };
}

export function registerFounderAssistant(
  platform: IntelligencePlatform,
  deps: { memoryEngine: MemoryEngine; organizationId: string },
): void {
  registerAIEmployee(platform, deps.organizationId, founderAssistantDefinition(deps.memoryEngine));
}
