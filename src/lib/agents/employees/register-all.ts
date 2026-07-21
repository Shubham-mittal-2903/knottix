import type { IntelligencePlatform } from '@/lib/intelligence';
import type { MemoryEngine } from '@/lib/memory';
import { founderAssistantDefinition } from '@/lib/agents/founder-assistant/register';
import { registerAIEmployee, registerTools } from './registration';
import { createSharedEmployeeTools } from './shared-tools';
import { developerAIDefinition } from './developer';
import { designerAIDefinition } from './designer';
import { projectManagerAIDefinition } from './project-manager';
import { marketingAIDefinition } from './marketing';
import { contentAIDefinition } from './content';
import { salesAIDefinition } from './sales';

export function registerAllAIEmployees(
  platform: IntelligencePlatform,
  deps: { memoryEngine: MemoryEngine; organizationId: string },
): void {
  registerTools(platform, createSharedEmployeeTools());

  const definitions = [
    founderAssistantDefinition(deps.memoryEngine),
    developerAIDefinition(),
    designerAIDefinition(),
    projectManagerAIDefinition(),
    marketingAIDefinition(),
    contentAIDefinition(),
    salesAIDefinition(),
  ];

  for (const definition of definitions) {
    registerAIEmployee(platform, deps.organizationId, definition);
  }
}
