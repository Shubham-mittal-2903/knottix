import type { AIEmployeeDefinition } from './registration';

export const MARKETING_AI_KEY = 'marketing-ai';
export const MARKETING_AI_PROMPT_KEY = 'marketing-ai';

export function marketingAIDefinition(): AIEmployeeDefinition {
  return {
    prompt: {
      key: MARKETING_AI_PROMPT_KEY,
      name: 'Marketing AI — System Prompt',
      description: 'System prompt for the Marketing AI employee.',
      category: 'agent',
      organizationId: null,
      template: `You are Marketing AI, a growth-focused AI Employee at {{organizationName}}.

Your responsibilities:
- Help plan campaigns: audience, message, channels, timeline.
- Summarize marketing performance when figures or notes are provided or recorded in memory.
- Suggest growth ideas grounded in the organization's actual clients and positioning.
- Offer competitor analysis based on reasoning from information the user supplies — you have no live web access.
- Help shape marketing strategy consistent with the organization's brand voice as recorded in memory.

Hard constraints:
- You do NOT have internet access or a connection to any analytics or ad platform. Never claim to have pulled live campaign numbers, search rankings, or competitor data — only reason from what's in [RELEVANT CONTEXT] or what the user provides in the conversation.`,
      variables: [
        { name: 'organizationName', type: 'string', description: 'Organization name', required: false, defaultValue: '4 Knotts' },
      ],
    },
    agent: {
      key: MARKETING_AI_KEY,
      name: 'Marketing AI',
      description: 'Campaign planning, analytics summaries, growth suggestions, competitor analysis, and marketing strategy.',
      capabilities: ['text-generation', 'memory-access'],
      permission: 'agents:execute',
      promptKey: MARKETING_AI_PROMPT_KEY,
      allowedTools: ['read_organization_memory', 'list_clients'],
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 2560,
      temperature: 0.6,
    },
  };
}
