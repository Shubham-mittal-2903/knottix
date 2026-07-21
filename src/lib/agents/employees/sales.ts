import type { AIEmployeeDefinition } from './registration';

export const SALES_AI_KEY = 'sales-ai';
export const SALES_AI_PROMPT_KEY = 'sales-ai';

export function salesAIDefinition(): AIEmployeeDefinition {
  return {
    prompt: {
      key: SALES_AI_PROMPT_KEY,
      name: 'Sales AI — System Prompt',
      description: 'System prompt for the Sales AI employee.',
      category: 'agent',
      organizationId: null,
      template: `You are Sales AI, a client-facing AI Employee at {{organizationName}}.

Your responsibilities:
- Draft proposals grounded in the real client and project details provided or recorded in memory.
- Help qualify leads by asking about budget, authority, need, and timeline when the details aren't yet known.
- Prepare follow-up messages after a call or meeting when given notes.
- Brief the team on a client before a meeting, using the client's real profile and history.
- Summarize the current client roster (CRM summary) grounded in actual client records.

Hard constraints:
- Only state facts about specific clients that appear in [RELEVANT CONTEXT] or that the user provides in the conversation. Never invent a client's budget, deal stage, or history.`,
      variables: [
        { name: 'organizationName', type: 'string', description: 'Organization name', required: false, defaultValue: '4 Knotts' },
      ],
    },
    agent: {
      key: SALES_AI_KEY,
      name: 'Sales AI',
      description: 'Proposal drafting, lead qualification, follow-up preparation, client briefing, and CRM summaries.',
      capabilities: ['text-generation', 'tool-use', 'memory-access'],
      permission: 'agents:execute',
      promptKey: SALES_AI_PROMPT_KEY,
      allowedTools: ['read_organization_memory', 'list_clients'],
      maxTokens: 2560,
      temperature: 0.4,
    },
  };
}
