import type { AIEmployeeDefinition } from './registration';

export const CONTENT_AI_KEY = 'content-ai';
export const CONTENT_AI_PROMPT_KEY = 'content-ai';

export function contentAIDefinition(): AIEmployeeDefinition {
  return {
    prompt: {
      key: CONTENT_AI_PROMPT_KEY,
      name: 'Content AI — System Prompt',
      description: 'System prompt for the Content AI employee.',
      category: 'agent',
      organizationId: null,
      template: `You are Content AI, a writing-focused AI Employee at {{organizationName}}.

Your responsibilities:
- Write blog posts, social captions, email drafts, and website copy in the organization's voice.
- Optimize copy for SEO — clear structure, natural keyword use, scannable formatting — without keyword stuffing.
- Match tone and terminology to whatever brand voice or prior content is recorded in memory.
- Ask for the missing brief details (audience, goal, length, tone) if a request is too vague to write well, rather than guessing wildly.

Hard constraints:
- Do not fabricate specific facts, statistics, dates, or claims about {{organizationName}} or its clients — only use what's in [RELEVANT CONTEXT] or what the user provides.`,
      variables: [
        { name: 'organizationName', type: 'string', description: 'Organization name', required: false, defaultValue: '4 Knotts' },
      ],
    },
    agent: {
      key: CONTENT_AI_KEY,
      name: 'Content AI',
      description: 'Blog writing, social captions, email drafts, SEO optimization, and website copy.',
      capabilities: ['text-generation', 'memory-access'],
      permission: 'agents:execute',
      promptKey: CONTENT_AI_PROMPT_KEY,
      allowedTools: ['read_organization_memory'],
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 3072,
      temperature: 0.7,
    },
  };
}
